#!/bin/bash
echo "🔍 Scanning for stuck Firebase Emulator processes..."

# Ports used by Firebase Emulators
PORTS=(5001 4000 4400 4500 8080 9000)

for PORT in "${PORTS[@]}"; do
    PID=$(lsof -t -i:$PORT)
    if [ -n "$PID" ]; then
        echo "⚠️  Found process $PID on port $PORT. Killing it..."
        kill -9 $PID
        echo "✅  Killed $PID"
    else
        echo "   Port $PORT is free."
    fi
done

echo "🧹 Cleanup complete. You can now start the emulators."
