#!/bin/bash
# Tormentor Server - Backup & Deploy Script
# Usage: ./vm_manager.sh [backup|deploy|list]

set -e

# Configuration
INSTANCE_NAME="cr-instance"
ZONE="us-central1-c"
MACHINE_TYPE="e2-medium"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Function to create snapshot
backup() {
    local description="$1"
    if [ -z "$description" ]; then
        description="Tormentor server backup $(date)"
    fi

    local snapshot_name="tormentor-$(date +%Y%m%d-%H%M%S)"

    print_info "Creating snapshot: $snapshot_name"
    print_info "Description: $description"

    gcloud compute disks snapshot $INSTANCE_NAME \
        --zone=$ZONE \
        --snapshot-names=$snapshot_name \
        --description="$description"

    print_success "Snapshot created: $snapshot_name"
    echo "Use this name to deploy: ./vm_manager.sh deploy $snapshot_name"
}

# Function to list snapshots
list_snapshots() {
    print_info "Available snapshots:"
    echo ""

    gcloud compute snapshots list \
        --filter="name:tormentor*" \
        --format="table(name:label=SNAPSHOT_NAME,creationTimestamp.date('%Y-%m-%d %H:%M'):label=CREATED,description:label=DESCRIPTION)" \
        --sort-by=~creationTimestamp
}

# Function to deploy from snapshot
deploy() {
    local snapshot_name="$1"

    if [ -z "$snapshot_name" ]; then
        echo "Available snapshots:"
        list_snapshots
        echo ""
        read -p "Enter snapshot name: " snapshot_name
    fi

    if [ -z "$snapshot_name" ]; then
        print_error "No snapshot name provided"
        exit 1
    fi

    # Check if snapshot exists
    if ! gcloud compute snapshots describe $snapshot_name --quiet >/dev/null 2>&1; then
        print_error "Snapshot '$snapshot_name' not found!"
        list_snapshots
        exit 1
    fi

    local vm_name="tormentor-$(date +%Y%m%d-%H%M%S)"

    print_info "Creating VM: $vm_name"
    print_info "From snapshot: $snapshot_name"
    print_info "Zone: $ZONE"

    # Create VM
    gcloud compute instances create $vm_name \
        --source-snapshot=$snapshot_name \
        --zone=$ZONE \
        --machine-type=$MACHINE_TYPE \
        --tags=http-server,https-server

    # Get IP
    local ip=$(gcloud compute instances describe $vm_name \
        --zone=$ZONE \
        --format="get(networkInterfaces[0].accessConfigs[0].natIP)")

    print_success "VM created successfully!"
    echo ""
    echo "📋 VM Details:"
    echo "   Name: $vm_name"
    echo "   IP: $ip"
    echo "   Zone: $ZONE"
    echo ""
    echo "🔧 SSH Access:"
    echo "   gcloud compute ssh $vm_name --zone=$ZONE"
    echo ""

    # Wait for VM to be ready
    print_info "Waiting for VM to boot (30 seconds)..."
    sleep 30

    print_info "Starting services on new VM..."

    # Restart services
    gcloud compute ssh $vm_name --zone=$ZONE --command="
        sudo systemctl restart nginx docker
        cd /home/malikmacbook/CRCoach/server && ./startup.sh
        echo 'Services restarted!'
    " --quiet || print_warning "Failed to restart services automatically"

    print_success "Deployment completed!"
    echo ""
    print_warning "Manual steps required:"
    echo "1. Update DNS: api.tormentor.dev → $ip"
    echo "2. Wait 5-15 minutes for DNS propagation"
    echo "3. Test: curl https://api.tormentor.dev/health"
}

# Function to show usage
usage() {
    echo "Tormentor Server VM Manager"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  backup [description]     Create a snapshot of current VM"
    echo "  deploy [snapshot-name]   Deploy new VM from snapshot"
    echo "  list                     List available snapshots"
    echo ""
    echo "Examples:"
    echo "  $0 backup \"Before update\""
    echo "  $0 deploy tormentor-20250613-202818"
    echo "  $0 list"
}

# Main
case "${1:-}" in
    "backup")
        backup "$2"
        ;;
    "deploy")
        deploy "$2"
        ;;
    "list")
        list_snapshots
        ;;
    *)
        usage
        exit 1
        ;;
esac