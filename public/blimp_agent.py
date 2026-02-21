#!/usr/bin/env python3
"""
Blimp Agent - Hardware Inventory Collector
Version 1.1.0

Cross-platform agent that collects:
  - Hardware info: make, model, serial number, CPU, RAM, storage
  - OS info: name, version, build number, architecture
  - Display info: EDID manufacturer, model, serial, resolution, year
  - Network info: hostname, IP addresses
  - Peripherals: keyboards, mice, docks, hubs, webcams, headsets (USB + Bluetooth)

Outputs a JSON report conforming to the Blimp AgentReport schema.

Usage:
  python blimp_agent.py                      # Print JSON to stdout
  python blimp_agent.py -o report.json       # Save to file
  python blimp_agent.py --server             # HTTP server on port 51723
  python blimp_agent.py --server --port 8080 # Custom port
"""

import argparse
import datetime
import glob
import hashlib
import json
import os
import platform
import re
import socket
import subprocess
import sys
from typing import Any, Dict, List, Optional

AGENT_VERSION = "1.1.0"
AGENT_PORT = 51723
SYSTEM = platform.system()  # 'Darwin', 'Windows', 'Linux'


# ─── Helpers ──────────────────────────────────────────────────────────────────

def run(cmd: List[str], timeout: int = 15) -> str:
    """Run a subprocess command and return stdout. Empty string on any error."""
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return result.stdout.strip()
    except Exception:
        return ""


def run_ps(script: str, timeout: int = 20) -> str:
    """Run a PowerShell snippet and return stdout (Windows only)."""
    try:
        result = subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy", "Bypass",
                "-Command", script,
            ],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return result.stdout.strip()
    except Exception:
        return ""


def ps_json(script: str) -> Any:
    """Run a PowerShell command and parse JSON output."""
    raw = run_ps(f"{script} | ConvertTo-Json -Depth 5 -Compress")
    try:
        return json.loads(raw)
    except Exception:
        return None


def bytes_to_gb(value: int) -> float:
    if not value:
        return 0.0
    return round(int(value) / (1024 ** 3), 1)


def decode_wmi_chars(arr: Optional[List[int]]) -> str:
    """Decode WMI integer char array to string (used for monitor IDs)."""
    if not arr:
        return ""
    try:
        return "".join(chr(c) for c in arr if 0 < c < 128).strip()
    except Exception:
        return ""


def parse_edid_manufacturer(edid_bytes: bytes) -> Optional[str]:
    """Extract 3-letter manufacturer ID from raw EDID bytes (bytes 8-9)."""
    if len(edid_bytes) < 10:
        return None
    try:
        m1, m2 = edid_bytes[8], edid_bytes[9]
        return (
            chr(((m1 >> 2) & 0x1F) + 64)
            + chr((((m1 & 0x03) << 3) | ((m2 >> 5) & 0x07)) + 64)
            + chr((m2 & 0x1F) + 64)
        )
    except Exception:
        return None


def parse_edid_descriptors(edid_bytes: bytes) -> Dict[str, str]:
    """Parse 18-byte descriptor blocks from EDID (bytes 54–125)."""
    result: Dict[str, str] = {}
    if len(edid_bytes) < 126:
        return result
    for i in range(4):
        block = edid_bytes[54 + i * 18 : 54 + (i + 1) * 18]
        if len(block) < 18:
            continue
        if block[0] == 0 and block[1] == 0 and block[2] == 0:
            dtype = block[3]
            data = block[5:].decode("latin-1", errors="ignore").replace("\n", "").strip()
            if dtype == 0xFC:
                result["name"] = data
            elif dtype == 0xFF:
                result["serial"] = data
    return result


# ─── Peripheral helpers ────────────────────────────────────────────────────────

# Keywords used to classify device names into peripheral categories
_PERIPHERAL_KEYWORDS: Dict[str, List[str]] = {
    "Keyboard": ["keyboard", " kbd", "keypad"],
    "Mouse": ["mouse", "trackball", "pointing device", "magic mouse", "magic trackpad", "trackpad"],
    "Dock": [
        "dock", "docking station", "caldigit", "thunderbolt dock",
        "usb-c hub", "multiport adapter", "usb c hub", "travel hub",
        "tb4 hub", "tb3 hub",
    ],
    "Hub": ["usb hub", "4-port", "7-port", "usb 3.0 hub", "usb 2.0 hub", "usb3 hub"],
    "Webcam": ["webcam", "hd cam", "c920", "c922", "c930", "brio", "streamcam", "facetime hd camera (external"],
    "Headset": ["headset", "headphone", "earphone", "earbuds", "airpods", "buds", "wh-", "wf-"],
}

# Names that indicate internal/system components we should skip
_NOISE_PATTERNS = [
    "root hub", "usb root", "host controller", "xhci", "ehci", "ohci", "uhci",
    "bluetooth host", "bluetooth usb host", "radio", "fingerprint",
    "touch id", "secure enclave", "ambient light", "accelerometer",
    "smc controller", "t1 controller", "t2 controller",
    "apple bus", "apple t2", "apple internal keyboard",
    "broadcom", "realtek bluetooth",
    "composite usb", "virtual", "generic usb hub",
    "facetime hd camera (built",  # built-in FaceTime, not external
    "apple mobile device",
    "usb2.0 hub", "usb2 hub",   # generic internal hubs
    "apple usb keyboard",        # covered separately via BT/USB leaf
]


def _classify_peripheral(name: str) -> str:
    """Return the peripheral category for a device name."""
    nl = name.lower()
    for ptype, keywords in _PERIPHERAL_KEYWORDS.items():
        if any(k in nl for k in keywords):
            return ptype
    return "Other"


def _is_noise(name: str) -> bool:
    """Return True if the device name indicates a system/internal component."""
    if not name or len(name) < 3:
        return True
    nl = name.lower()
    return any(p in nl for p in _NOISE_PATTERNS)


def _make_peripheral(
    ptype: str,
    name: str,
    manufacturer: Optional[str] = None,
    serial: Optional[str] = None,
    vendor_id: Optional[str] = None,
    product_id: Optional[str] = None,
    connection_type: str = "USB",
    is_builtin: bool = False,
) -> Dict[str, Any]:
    return {
        "type": ptype,
        "name": name,
        "manufacturer": manufacturer or None,
        "serial": serial or None,
        "vendorId": vendor_id or None,
        "productId": product_id or None,
        "connectionType": connection_type,
        "isBuiltIn": is_builtin,
    }


# ─── macOS collection ─────────────────────────────────────────────────────────

def _flatten_usb_macos(node: Dict, results: List[Dict]) -> None:
    """Recursively flatten SPUSBDataType tree, collecting leaf devices."""
    children = node.get("_items", [])
    if children:
        for child in children:
            _flatten_usb_macos(child, results)
    else:
        # Leaf node — an actual device
        if "_name" in node:
            results.append(node)


def collect_peripherals_macos() -> List[Dict]:
    peripherals: List[Dict] = []
    seen: set = set()  # deduplicate by (name, vendor_id, product_id)

    def _add(p: Dict) -> None:
        key = (p["name"].lower(), p.get("vendorId"), p.get("productId"), p["connectionType"])
        if key not in seen:
            seen.add(key)
            peripherals.append(p)

    # ── USB devices ──────────────────────────────────────────────────────────
    try:
        usb_raw = run(["system_profiler", "SPUSBDataType", "-json"])
        usb_data = json.loads(usb_raw).get("SPUSBDataType", [])
        all_usb: List[Dict] = []
        for bus in usb_data:
            _flatten_usb_macos(bus, all_usb)

        for dev in all_usb:
            name = dev.get("_name", "").strip()
            if not name or _is_noise(name):
                continue

            manufacturer = dev.get("manufacturer", "") or None
            serial = dev.get("serial_num", "") or None
            vendor_id = dev.get("vendor_id", "") or None
            product_id = dev.get("product_id", "") or None
            is_builtin = any(k in name.lower() for k in ("built-in", "internal", "apple internal"))

            ptype = _classify_peripheral(name)
            if ptype == "Other" and not any(
                k in name.lower() for k in ("dock", "hub", "switch", "adapter", "display")
            ):
                # Skip unnamed/unclassifiable USB noise
                continue

            _add(_make_peripheral(ptype, name, manufacturer, serial, vendor_id, product_id, "USB", is_builtin))
    except Exception:
        pass

    # ── Bluetooth devices ────────────────────────────────────────────────────
    try:
        bt_raw = run(["system_profiler", "SPBluetoothDataType", "-json"])
        bt_data = json.loads(bt_raw).get("SPBluetoothDataType", [])
        for section in bt_data:
            for list_key in ("device_connected", "device_not_connected", "device_paired"):
                for bt_dev in section.get(list_key, []):
                    name = bt_dev.get("device_name", "").strip()
                    if not name or _is_noise(name):
                        continue
                    vendor_id = bt_dev.get("device_vendorID") or None
                    product_id = bt_dev.get("device_productID") or None
                    ptype = _classify_peripheral(name)
                    _add(_make_peripheral(ptype, name, None, None, vendor_id, product_id, "Bluetooth", False))
    except Exception:
        pass

    # ── Thunderbolt devices (docks, eGPUs, displays) ─────────────────────────
    try:
        tb_raw = run(["system_profiler", "SPThunderboltDataType", "-json"])
        tb_data = json.loads(tb_raw).get("SPThunderboltDataType", [])
        for bus in tb_data:
            for dev in bus.get("_items", []):
                name = (dev.get("device_name_key") or dev.get("_name") or "").strip()
                if not name or _is_noise(name):
                    continue
                # Skip the host controller entry itself
                if "host controller" in name.lower() or "thunderbolt bus" in name.lower():
                    continue
                vendor = dev.get("vendor_name_key") or None
                vendor_id = dev.get("vendor_id_key") or None
                product_id = dev.get("device_id_key") or None
                ptype = _classify_peripheral(name)
                if ptype == "Other":
                    ptype = "Dock"  # Thunderbolt unknowns are almost always docks/hubs
                _add(_make_peripheral(ptype, name, vendor, None, vendor_id, product_id, "Thunderbolt", False))
    except Exception:
        pass

    return peripherals


def collect_macos() -> Dict[str, Any]:
    hw_raw = run(["system_profiler", "SPHardwareDataType", "-json"])
    sw_raw = run(["system_profiler", "SPSoftwareDataType", "-json"])
    disp_raw = run(["system_profiler", "SPDisplaysDataType", "-json"])
    disk_raw = run(["system_profiler", "SPStorageDataType", "-json"])

    hw: Dict = {}
    sw: Dict = {}
    gpu_entries: List[Dict] = []
    disk_entries: List[Dict] = []

    try:
        hw = json.loads(hw_raw).get("SPHardwareDataType", [{}])[0]
    except Exception:
        pass
    try:
        sw = json.loads(sw_raw).get("SPSoftwareDataType", [{}])[0]
    except Exception:
        pass
    try:
        for gpu in json.loads(disp_raw).get("SPDisplaysDataType", []):
            gpu_entries.extend(gpu.get("spdisplays_ndrvs", []))
    except Exception:
        pass
    try:
        disk_entries = json.loads(disk_raw).get("SPStorageDataType", [])
    except Exception:
        pass

    # Hardware
    serial = hw.get("serial_number", "UNKNOWN")
    model = hw.get("machine_model", "Unknown")
    machine_name = hw.get("machine_name", model)
    cpu = hw.get("chip_type") or hw.get("cpu_type", "")
    ram_str = hw.get("physical_memory", "0 GB")
    try:
        ram_gb = float(ram_str.split()[0])
    except Exception:
        ram_gb = 0.0

    # OS
    os_full = sw.get("os_version", "macOS")  # e.g. "macOS 14.3 (23D56)"
    os_version = ""
    build = ""
    parts = os_full.split()
    for p in parts:
        if p[0].isdigit():
            os_version = p
        elif p.startswith("(") and p.endswith(")"):
            build = p.strip("()")

    arch = platform.machine()  # "arm64" or "x86_64"

    # Storage
    storage: List[Dict] = []
    for disk in disk_entries:
        total = disk.get("size_in_bytes", 0)
        free = disk.get("free_size_in_bytes", 0)
        label = disk.get("mount_point") or disk.get("_name", "Disk")
        if total and total > 0:
            storage.append({
                "label": label,
                "totalGB": bytes_to_gb(total),
                "freeGB": bytes_to_gb(free),
            })

    # Displays
    displays: List[Dict] = []
    for d in gpu_entries:
        name = d.get("_name", "Unknown Display")
        resolution = d.get("_spdisplays_resolution") or d.get("spdisplays_resolution", "")
        vendor = d.get("spdisplays_vendor", "")
        disp_serial = d.get("_spdisplays_display-serial-number") or d.get("spdisplays_display_serialnumber", "")
        edid_str = d.get("spdisplays_edid", "")

        is_builtin = any(k in name.lower() for k in ("built", "retina", "liquid", "studio display")) \
            or "internal" in d.get("spdisplays_connection_type", "").lower()

        manufacturer_id = None
        year = None
        edid_version = d.get("spdisplays_edid-version", "")

        if edid_str:
            try:
                edid_bytes = bytes.fromhex(edid_str.replace(" ", "").replace("\n", ""))
                manufacturer_id = parse_edid_manufacturer(edid_bytes)
                if len(edid_bytes) > 17:
                    year = 1990 + edid_bytes[17]
                descriptors = parse_edid_descriptors(edid_bytes)
                if not disp_serial and descriptors.get("serial"):
                    disp_serial = descriptors["serial"]
            except Exception:
                pass

        # Refresh rate
        refresh = None
        if resolution:
            m = re.search(r"@\s*(\d+)\s*Hz", resolution)
            if m:
                refresh = int(m.group(1))

        displays.append({
            "name": name,
            "manufacturer": vendor or None,
            "manufacturerId": manufacturer_id,
            "serial": disp_serial or None,
            "year": year,
            "resolution": resolution or None,
            "refreshRate": refresh,
            "isBuiltIn": is_builtin,
            "edidVersion": edid_version or None,
        })

    return {
        "platform": "macOS",
        "hostname": socket.gethostname(),
        "hardware": {
            "make": "Apple",
            "model": machine_name or model,
            "serial": serial,
            "cpu": cpu,
            "ramGB": ram_gb,
            "storage": storage,
        },
        "os": {
            "name": os_full.split("(")[0].strip() or "macOS",
            "version": os_version,
            "buildNumber": build or None,
            "architecture": arch,
        },
        "displays": displays,
        "peripherals": collect_peripherals_macos(),
    }


# ─── Windows collection ───────────────────────────────────────────────────────

def collect_peripherals_windows() -> List[Dict]:
    peripherals: List[Dict] = []
    seen: set = set()

    def _add(p: Dict) -> None:
        key = (p["name"].lower(), p.get("vendorId"), p.get("productId"), p["connectionType"])
        if key not in seen:
            seen.add(key)
            peripherals.append(p)

    # ── Keyboards ────────────────────────────────────────────────────────────
    try:
        kb_raw = ps_json("Get-CimInstance Win32_Keyboard")
        keyboards = kb_raw if isinstance(kb_raw, list) else ([kb_raw] if isinstance(kb_raw, dict) else [])
        for kb in keyboards:
            if not isinstance(kb, dict):
                continue
            name = (kb.get("Name") or kb.get("Description") or "").strip()
            if not name or _is_noise(name):
                continue
            name_lower = name.lower()
            is_builtin = any(k in name_lower for k in ("ps/2", "standard ps/2")) and "usb" not in name_lower
            conn = "Bluetooth" if "bluetooth" in name_lower else ("USB" if "usb" in name_lower else ("Other" if is_builtin else "USB"))
            _add(_make_peripheral("Keyboard", name, kb.get("Manufacturer") or None, None, None, None, conn, is_builtin))
    except Exception:
        pass

    # ── Pointing devices (mice, touchpads) ───────────────────────────────────
    try:
        mice_raw = ps_json("Get-CimInstance Win32_PointingDevice")
        mice = mice_raw if isinstance(mice_raw, list) else ([mice_raw] if isinstance(mice_raw, dict) else [])
        for mouse in mice:
            if not isinstance(mouse, dict):
                continue
            name = (mouse.get("Name") or mouse.get("Description") or "").strip()
            if not name or _is_noise(name):
                continue
            name_lower = name.lower()
            is_builtin = any(k in name_lower for k in ("touchpad", "trackpad", "synaptics", "elan", "alps", "i2c hid", "precision touchpad"))
            conn = "Bluetooth" if "bluetooth" in name_lower else ("USB" if "usb" in name_lower else ("Other" if is_builtin else "USB"))
            _add(_make_peripheral("Mouse", name, mouse.get("Manufacturer") or None, None, None, None, conn, is_builtin))
    except Exception:
        pass

    # ── Docks and hubs via PnP ───────────────────────────────────────────────
    try:
        pnp_script = (
            "Get-PnpDevice | "
            "Where-Object { $_.Status -eq 'OK' -and "
            "($_.FriendlyName -match 'dock|docking|caldigit|belkin|anker|plugable|kensington|hub') } | "
            "Select-Object FriendlyName, Manufacturer, DeviceID | "
            "ConvertTo-Json -Depth 3 -Compress"
        )
        dock_raw = run_ps(pnp_script)
        dock_data = json.loads(dock_raw)
        docks = dock_data if isinstance(dock_data, list) else ([dock_data] if isinstance(dock_data, dict) else [])
        for dock in docks:
            if not isinstance(dock, dict):
                continue
            name = (dock.get("FriendlyName") or "").strip()
            if not name or _is_noise(name):
                continue
            ptype = _classify_peripheral(name)
            _add(_make_peripheral(ptype, name, dock.get("Manufacturer") or None, None, None, None, "USB", False))
    except Exception:
        pass

    # ── Webcams and audio devices via PnP ────────────────────────────────────
    try:
        av_script = (
            "Get-PnpDevice | "
            "Where-Object { $_.Status -eq 'OK' -and "
            "($_.FriendlyName -match 'webcam|camera|headset|headphone|earphone|microphone|logitech|brio|c920|c922|jabra|plantronics|poly|sennheiser|steelseries') } | "
            "Select-Object FriendlyName, Manufacturer, DeviceID | "
            "ConvertTo-Json -Depth 3 -Compress"
        )
        av_raw = run_ps(av_script)
        av_data = json.loads(av_raw)
        avs = av_data if isinstance(av_data, list) else ([av_data] if isinstance(av_data, dict) else [])
        for av in avs:
            if not isinstance(av, dict):
                continue
            name = (av.get("FriendlyName") or "").strip()
            if not name or _is_noise(name):
                continue
            ptype = _classify_peripheral(name)
            if ptype == "Other":
                # Determine from context
                nl = name.lower()
                if any(k in nl for k in ("webcam", "camera")):
                    ptype = "Webcam"
                elif any(k in nl for k in ("headset", "headphone", "earphone", "mic")):
                    ptype = "Headset"
                else:
                    continue
            _add(_make_peripheral(ptype, name, av.get("Manufacturer") or None, None, None, None, "USB", False))
    except Exception:
        pass

    return peripherals


def collect_windows() -> Dict[str, Any]:
    sys_info = ps_json("Get-CimInstance Win32_ComputerSystem") or {}
    bios_info = ps_json("Get-CimInstance Win32_BIOS") or {}
    cpu_raw = ps_json("Get-CimInstance Win32_Processor") or {}
    mem_raw = ps_json("Get-CimInstance Win32_PhysicalMemory") or {}
    os_raw = ps_json("Get-CimInstance Win32_OperatingSystem") or {}
    disk_raw = ps_json('Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3"') or []

    # Monitor EDID via WMI
    mon_raw = run_ps(
        "Get-CimInstance -ClassName WmiMonitorID -Namespace root\\wmi | ConvertTo-Json -Depth 5 -Compress"
    )
    monitors_wmi: List[Dict] = []
    try:
        parsed = json.loads(mon_raw)
        monitors_wmi = parsed if isinstance(parsed, list) else [parsed]
    except Exception:
        pass

    # Hardware
    make = sys_info.get("Manufacturer", "Unknown")
    model = sys_info.get("Model", "Unknown")
    serial = bios_info.get("SerialNumber", "UNKNOWN")

    if isinstance(cpu_raw, list):
        cpu_raw = cpu_raw[0] if cpu_raw else {}
    cpu = cpu_raw.get("Name", "").strip() if isinstance(cpu_raw, dict) else ""

    # RAM
    mem_list = mem_raw if isinstance(mem_raw, list) else ([mem_raw] if isinstance(mem_raw, dict) else [])
    total_ram = sum(int(m.get("Capacity", 0)) for m in mem_list if isinstance(m, dict))
    ram_gb = bytes_to_gb(total_ram)

    # OS
    if isinstance(os_raw, list):
        os_raw = os_raw[0] if os_raw else {}
    os_name = os_raw.get("Caption", "Windows") if isinstance(os_raw, dict) else "Windows"
    os_version = os_raw.get("Version", "") if isinstance(os_raw, dict) else ""
    os_build = os_raw.get("BuildNumber", "") if isinstance(os_raw, dict) else ""
    arch_str = os_raw.get("OSArchitecture", "64-bit") if isinstance(os_raw, dict) else "64-bit"
    arch = "x64" if "64" in arch_str else "x86"

    # Storage
    disk_list = disk_raw if isinstance(disk_raw, list) else ([disk_raw] if isinstance(disk_raw, dict) else [])
    storage: List[Dict] = []
    for disk in disk_list:
        if not isinstance(disk, dict):
            continue
        label = disk.get("DeviceID", "C:")
        total = disk.get("Size", 0)
        free = disk.get("FreeSpace", 0)
        if total and int(total) > 0:
            storage.append({
                "label": label,
                "totalGB": bytes_to_gb(int(total)),
                "freeGB": bytes_to_gb(int(free)),
            })

    # Displays
    displays: List[Dict] = []
    for m in monitors_wmi:
        if not isinstance(m, dict):
            continue
        name = decode_wmi_chars(m.get("UserFriendlyName"))
        mfr = decode_wmi_chars(m.get("ManufacturerName"))
        disp_serial = decode_wmi_chars(m.get("SerialNumberID"))
        product_id = decode_wmi_chars(m.get("ProductCodeID"))
        year = m.get("YearOfManufacture")
        week = m.get("WeekOfManufacture")
        instance = m.get("InstanceName", "")
        is_builtin = any(k in instance for k in ("DISPLAY\\LEN", "DISPLAY\\AUO", "DISPLAY\\BOE", "DISPLAY\\CMN"))

        if name:
            displays.append({
                "name": name,
                "manufacturer": mfr or None,
                "manufacturerId": mfr[:3] if mfr else None,
                "productId": product_id or None,
                "serial": disp_serial or None,
                "year": year,
                "week": week,
                "isBuiltIn": is_builtin,
            })

    return {
        "platform": "Windows",
        "hostname": socket.gethostname(),
        "hardware": {
            "make": make,
            "model": model,
            "serial": serial,
            "cpu": cpu,
            "ramGB": ram_gb,
            "storage": storage,
        },
        "os": {
            "name": os_name,
            "version": os_version,
            "buildNumber": os_build or None,
            "architecture": arch,
        },
        "displays": displays,
        "peripherals": collect_peripherals_windows(),
    }


# ─── Linux collection ─────────────────────────────────────────────────────────

def collect_peripherals_linux() -> List[Dict]:
    peripherals: List[Dict] = []
    seen: set = set()

    def _add(p: Dict) -> None:
        key = (p["name"].lower(), p.get("vendorId"), p.get("productId"), p["connectionType"])
        if key not in seen:
            seen.add(key)
            peripherals.append(p)

    # ── Keyboards and mice from /proc/bus/input/devices ───────────────────────
    try:
        with open("/proc/bus/input/devices") as f:
            content = f.read()

        for block in content.strip().split("\n\n"):
            fields: Dict[str, str] = {}
            for line in block.strip().splitlines():
                if len(line) < 3 or line[1] != ":":
                    continue
                fields[line[0]] = line[3:].strip()

            name = fields.get("N", "").strip('"')
            ident_str = fields.get("I", "")
            handlers = fields.get("H", "")
            sysfs_path = fields.get("S", "").strip()

            if not name or _is_noise(name):
                continue

            bus_m = re.search(r"Bus=(\w+)", ident_str)
            vendor_m = re.search(r"Vendor=(\w+)", ident_str)
            product_m = re.search(r"Product=(\w+)", ident_str)

            bus = bus_m.group(1) if bus_m else ""
            vendor_id = vendor_m.group(1) if vendor_m else None
            product_id = product_m.group(1) if product_m else None

            # Bus 0003 = USB, 0005 = Bluetooth; skip PS/2 (0011) = built-in
            if bus not in ("0003", "0005"):
                continue

            is_kbd = bool(re.search(r"\bkbd\b", handlers))
            is_mouse = bool(re.search(r"\bmouse\b", handlers))
            if not is_kbd and not is_mouse:
                continue

            conn = "USB" if bus == "0003" else "Bluetooth"
            ptype = "Keyboard" if is_kbd else "Mouse"

            # Try to resolve manufacturer from sysfs USB device tree
            manufacturer = None
            if sysfs_path:
                path = sysfs_path
                for _ in range(6):
                    mfr_file = f"/sys{path}/manufacturer"
                    try:
                        with open(mfr_file) as mf:
                            manufacturer = mf.read().strip()
                        break
                    except Exception:
                        path = "/".join(path.rstrip("/").rsplit("/", 1)[:-1])
                        if not path or path == "/":
                            break

            vid = f"0x{vendor_id}" if vendor_id and vendor_id != "0000" else None
            pid = f"0x{product_id}" if product_id and product_id != "0000" else None
            _add(_make_peripheral(ptype, name, manufacturer, None, vid, pid, conn, False))
    except Exception:
        pass

    # ── Docks and hubs from lsusb ─────────────────────────────────────────────
    try:
        lsusb_out = run(["lsusb"])
        for line in lsusb_out.splitlines():
            # Format: "Bus 001 Device 003: ID 0bda:0411 Realtek Semiconductor Corp. 4-Port USB 3.0 Hub"
            colon_split = line.split(":", 1)
            if len(colon_split) < 2:
                continue
            desc_part = colon_split[1].strip()
            vid_pid_m = re.search(r"ID (\w{4}):(\w{4})\s+(.*)", desc_part)
            if not vid_pid_m:
                continue
            vendor_id = vid_pid_m.group(1)
            product_id = vid_pid_m.group(2)
            desc = vid_pid_m.group(3).strip()

            if not desc or _is_noise(desc):
                continue

            ptype = _classify_peripheral(desc)
            if ptype not in ("Dock", "Hub"):
                continue  # keyboards/mice already handled above

            _add(_make_peripheral(ptype, desc, None, None, f"0x{vendor_id}", f"0x{product_id}", "USB", False))
    except Exception:
        pass

    # ── Bluetooth devices from /var/lib/bluetooth ─────────────────────────────
    try:
        for info_path in glob.glob("/var/lib/bluetooth/*/*/info"):
            with open(info_path) as f:
                bt_info = f.read()

            name_m = re.search(r"^Name=(.+)$", bt_info, re.MULTILINE)
            if not name_m:
                continue
            name = name_m.group(1).strip()
            if not name or _is_noise(name):
                continue

            # Skip if already detected via /proc/bus/input/devices
            if any(p["name"].lower() == name.lower() for p in peripherals):
                continue

            ptype = _classify_peripheral(name)
            _add(_make_peripheral(ptype, name, None, None, None, None, "Bluetooth", False))
    except Exception:
        pass

    return peripherals


def collect_linux() -> Dict[str, Any]:
    def dmi(path: str) -> str:
        try:
            with open(f"/sys/class/dmi/id/{path}") as f:
                return f.read().strip()
        except Exception:
            return ""

    make = dmi("sys_vendor") or dmi("board_vendor") or "Unknown"
    model = dmi("product_name") or dmi("board_name") or "Unknown"
    serial = dmi("product_serial") or dmi("board_serial") or "UNKNOWN"

    # CPU
    cpu = ""
    try:
        with open("/proc/cpuinfo") as f:
            for line in f:
                if line.startswith("model name"):
                    cpu = line.split(":", 1)[1].strip()
                    break
    except Exception:
        pass
    if not cpu:
        cpu = run(["lscpu"])

    # RAM
    ram_gb = 0.0
    try:
        with open("/proc/meminfo") as f:
            for line in f:
                if line.startswith("MemTotal:"):
                    kb = int(line.split()[1])
                    ram_gb = round(kb / 1_048_576, 1)
                    break
    except Exception:
        pass

    # Storage
    storage: List[Dict] = []
    try:
        disk_out = run(["lsblk", "-Jd", "-b", "-o", "NAME,SIZE,TYPE"])
        for d in json.loads(disk_out).get("blockdevices", []):
            if d.get("type") == "disk" and d.get("size"):
                storage.append({
                    "label": f"/dev/{d['name']}",
                    "totalGB": bytes_to_gb(int(d["size"])),
                    "freeGB": None,
                })
    except Exception:
        pass

    # OS
    distro = ""
    try:
        with open("/etc/os-release") as f:
            for line in f:
                if line.startswith("PRETTY_NAME="):
                    distro = line.split("=", 1)[1].strip().strip('"')
                    break
    except Exception:
        pass
    kernel = run(["uname", "-r"])
    arch = run(["uname", "-m"])

    # Displays via /sys/class/drm EDID
    displays: List[Dict] = []
    for edid_path in glob.glob("/sys/class/drm/*/edid"):
        try:
            with open(edid_path, "rb") as f:
                edid_bytes = f.read()
            if len(edid_bytes) < 128:
                continue
            # Validate EDID magic header
            if edid_bytes[:8] != b"\x00\xff\xff\xff\xff\xff\xff\x00":
                continue

            mfr = parse_edid_manufacturer(edid_bytes)
            year = 1990 + edid_bytes[17] if len(edid_bytes) > 17 else None
            descriptors = parse_edid_descriptors(edid_bytes)

            conn_name = edid_path.split("/")[-2]  # e.g. card0-HDMI-A-1
            is_builtin = any(k in conn_name for k in ("eDP", "LVDS", "DSI"))

            displays.append({
                "name": descriptors.get("name") or conn_name,
                "manufacturer": mfr,
                "manufacturerId": mfr,
                "serial": descriptors.get("serial") or None,
                "year": year,
                "isBuiltIn": is_builtin,
            })
        except Exception:
            continue

    return {
        "platform": "Linux",
        "hostname": socket.gethostname(),
        "hardware": {
            "make": make,
            "model": model,
            "serial": serial,
            "cpu": cpu,
            "ramGB": ram_gb,
            "storage": storage,
        },
        "os": {
            "name": distro or f"Linux {kernel}",
            "version": kernel,
            "buildNumber": None,
            "architecture": arch,
        },
        "displays": displays,
        "peripherals": collect_peripherals_linux(),
    }


# ─── Main collector ───────────────────────────────────────────────────────────

def collect() -> Dict[str, Any]:
    if SYSTEM == "Darwin":
        data = collect_macos()
    elif SYSTEM == "Windows":
        data = collect_windows()
    else:
        data = collect_linux()

    serial = data["hardware"]["serial"]
    device_id = hashlib.sha256(f"{SYSTEM}:{serial}".encode()).hexdigest()[:16]

    ip_addresses: List[str] = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip_addresses = [s.getsockname()[0]]
        s.close()
    except Exception:
        try:
            ip_addresses = [socket.gethostbyname(socket.gethostname())]
        except Exception:
            pass

    return {
        "version": AGENT_VERSION,
        "generatedAt": datetime.datetime.utcnow().isoformat() + "Z",
        "deviceId": device_id,
        "platform": data["platform"],
        "hostname": data["hostname"],
        "hardware": data["hardware"],
        "os": data["os"],
        "network": {
            "hostname": data["hostname"],
            "ipAddresses": ip_addresses,
        },
        "displays": data.get("displays", []),
        "peripherals": data.get("peripherals", []),
    }


# ─── HTTP server mode ─────────────────────────────────────────────────────────

def run_server(port: int = AGENT_PORT) -> None:
    from http.server import BaseHTTPRequestHandler, HTTPServer

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            if self.path == "/report":
                payload = json.dumps(collect(), indent=2).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(payload)))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(payload)
            elif self.path == "/health":
                body = json.dumps({"status": "ok", "agent": "blimp-agent", "version": AGENT_VERSION}).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(body)
            else:
                self.send_response(404)
                self.end_headers()

        def do_OPTIONS(self) -> None:
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            self.end_headers()

        def log_message(self, fmt: str, *args: Any) -> None:
            ts = datetime.datetime.now().strftime("%H:%M:%S")
            print(f"[{ts}] {fmt % args}", file=sys.stderr)

    print(f"Blimp Agent v{AGENT_VERSION} — listening on http://localhost:{port}", file=sys.stderr)
    print(f"  GET /report  → full hardware + peripheral inventory", file=sys.stderr)
    print(f"  GET /health  → health check", file=sys.stderr)
    print("Press Ctrl+C to stop.\n", file=sys.stderr)
    HTTPServer(("localhost", port), Handler).serve_forever()


# ─── Entry point ──────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Blimp Hardware Inventory Agent",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("-o", "--output", metavar="FILE", help="Write JSON report to FILE instead of stdout")
    parser.add_argument("--server", action="store_true", help=f"Run local HTTP server on port {AGENT_PORT}")
    parser.add_argument("--port", type=int, default=AGENT_PORT, help=f"HTTP server port (default: {AGENT_PORT})")
    parser.add_argument("--compact", action="store_true", help="Compact JSON (no indentation)")
    args = parser.parse_args()

    if args.server:
        run_server(args.port)
        return

    data = collect()
    output = json.dumps(data, indent=None if args.compact else 2)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(output)
        print(f"Report saved to: {args.output}", file=sys.stderr)
        print(f"Device: {data['hardware']['make']} {data['hardware']['model']} ({data['hardware']['serial']})", file=sys.stderr)
        print(f"Platform: {data['platform']} {data['os']['version']}", file=sys.stderr)
        print(f"Displays: {len(data['displays'])} detected", file=sys.stderr)
        print(f"Peripherals: {len(data['peripherals'])} detected", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()
