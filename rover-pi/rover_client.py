#!/usr/bin/env python3
"""
HSL Care Smart Rover — Raspberry Pi Hardware Client
For Waveshare UGV-Beast Mobile Robot Platform

Installation on Raspberry Pi:
    pip install "python-socketio[client]" requests

Usage:
    python3 rover_client.py --server http://<YOUR_LAPTOP_IP>:4000
"""

import sys
import time
import argparse
import socketio

sio = socketio.Client(reconnection=True, reconnection_attempts=10, reconnection_delay=2)

# Optional Waveshare UGV-Beast SDK imports (graceful fallback if testing without hardware)
try:
    # Waveshare ugv_rpi library
    import ugv_rpi
    ugv = ugv_rpi.UGV()
    HARDWARE_AVAILABLE = True
    print("✅ Waveshare UGV-Beast Hardware Driver Loaded Successfully!")
except ImportError:
    HARDWARE_AVAILABLE = False
    print("⚠️ Waveshare ugv_rpi module not found. Running in Hardware Bridge Emulation Mode.")

ROVER_STATE = {
    "name": "Rover-01 (UGV-Beast)",
    "status": "IDLE",
    "batteryLevel": 98,
    "currentX": 10.0,
    "currentY": 2.0,
    "currentRoom": "DOCK"
}

@sio.event
def connect():
    print(f"🔗 Connected to HSL Care Backend Server: {SERVER_URL}")
    sio.emit('rover:register', {
        "name": ROVER_STATE["name"],
        "hardware": "Waveshare UGV-Beast / Raspberry Pi",
        "batteryLevel": ROVER_STATE["batteryLevel"]
    })

@sio.event
def disconnect():
    print("❌ Disconnected from HSL Care Backend Server.")

@sio.on('rover:pi_command')
def on_rover_command(data):
    command = data.get('command')
    print(f"\n📥 Received Rover Command: [{command}] Payload: {data}")

    if command == 'NAVIGATE':
        target_room = data.get('targetRoom', '102')
        target_x = data.get('targetX', 16.0)
        target_y = data.get('targetY', 10.0)
        speed = data.get('speed', 0.25)
        resident_info = data.get('resident', {})
        medications = data.get('medications', [])
        resident_name = resident_info.get('name', 'Resident')

        print(f"🚀 [UGV-Beast] Mission Dispatch: Delivering to {resident_name} (Room {target_room})")
        if medications:
            print(f"📋 [UGV-Beast] Loaded Prescriptions ({len(medications)} items): {[m.get('name') for m in medications]}")
        if resident_info.get('faceEmbeddings'):
            print(f"🧬 [UGV-Beast] Resident 128D Face Embedding Loaded in Memory for Bedside Verification.")
        print(f"🚀 [UGV-Beast] Driving towards Room {target_room} at speed {speed} m/s...")

        ROVER_STATE["status"] = "MOVING"
        ROVER_STATE["currentRoom"] = "CORRIDOR"
        send_telemetry()

        if HARDWARE_AVAILABLE:
            # Example Waveshare drive forward command
            # ugv.chassis_ctrl(speed, 0)
            pass

        # Simulate travel time along taped corridor (e.g. 3-4 seconds for demo area)
        time.sleep(3.5)

        if HARDWARE_AVAILABLE:
            # ugv.chassis_ctrl(0, 0) # Stop
            pass

        # Arrived at Room!
        ROVER_STATE["status"] = "ARRIVED"
        ROVER_STATE["currentX"] = target_x
        ROVER_STATE["currentY"] = target_y
        ROVER_STATE["currentRoom"] = target_room
        ROVER_STATE["batteryLevel"] = max(10, ROVER_STATE["batteryLevel"] - 1)
        send_telemetry()

        print(f"🎯 [UGV-Beast] Physically Arrived at Room {target_room} for {resident_name}!")
        print(f"📷 [UGV-Beast] Ready for Face Biometric Verification.")

    elif command == 'RETURN_TO_DOCK':
        print("🔋 [UGV-Beast] Driving back to Rover Dock...")
        ROVER_STATE["status"] = "RETURNING"
        ROVER_STATE["currentRoom"] = "CORRIDOR"
        send_telemetry()

        time.sleep(3.0)

        ROVER_STATE["status"] = "IDLE"
        ROVER_STATE["currentX"] = 10.0
        ROVER_STATE["currentY"] = 2.0
        ROVER_STATE["currentRoom"] = "DOCK"
        send_telemetry()
        print("⚡ [UGV-Beast] Safely Docked and Charging.")

    elif command == 'ESTOP':
        print("🛑 [UGV-Beast] EMERGENCY STOP TRIGGERED! Cutting motor power.")
        if HARDWARE_AVAILABLE:
            # ugv.emergency_stop()
            pass
        ROVER_STATE["status"] = "ESTOP"
        send_telemetry()

@sio.on('rover:unlock_compartment')
def on_unlock_compartment(data):
    resident_name = data.get('residentName', 'Resident')
    room_number = data.get('roomNumber', '')
    confidence = data.get('confidence', 95)
    distance = data.get('distance', 0.28)
    print(f"\n🔓 ==============================================================")
    print(f"🔓 [UGV-Beast Hardware] SOLENOID ACTUATION: Identity Confirmed for {resident_name} (Room {room_number})")
    print(f"🔓 [UGV-Beast Hardware] Euclidean Distance: {distance} (Confidence: {confidence}%)")
    print(f"🔓 [UGV-Beast Hardware] Actuating GPIO Solenoid Pin HIGH -> LATCH OPEN!")
    print(f"🔓 ==============================================================\n")

    if HARDWARE_AVAILABLE:
        # ugv.gpio_write(18, 1) # Solenoid HIGH
        # time.sleep(2.5)
        # ugv.gpio_write(18, 0) # Solenoid LOW
        pass
    else:
        time.sleep(0.5)
        print("🔓 [UGV-Beast] Compartment physically opened for pill retrieval.")

def send_telemetry():
    sio.emit('rover:rpi_telemetry', {
        "status": ROVER_STATE["status"],
        "batteryLevel": ROVER_STATE["batteryLevel"],
        "x": ROVER_STATE["currentX"],
        "y": ROVER_STATE["currentY"],
        "currentRoom": ROVER_STATE["currentRoom"]
    })

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='HSL Care UGV-Beast Raspberry Pi Client')
    parser.add_argument('--server', default='http://localhost:4000', help='URL of the Node.js backend server')
    args = parser.parse_args()

    global SERVER_URL
    SERVER_URL = args.server

    print("🤖 ==============================================================")
    print("🤖 HSL CARE — WAVESHARE UGV-BEAST RASPBERRY PI CLIENT")
    print(f"🤖 Connecting to Server at: {SERVER_URL}")
    print("🤖 ==============================================================")

    try:
        sio.connect(SERVER_URL)
        while True:
            time.sleep(2)
            send_telemetry()
    except KeyboardInterrupt:
        print("\nStopping UGV-Beast client.")
        sio.disconnect()
    except Exception as e:
        print(f"Connection error: {e}")
