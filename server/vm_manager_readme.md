# Tormentor Server VM Manager

Simple script to backup and deploy your Tormentor server VM using Google Cloud snapshots.

## Prerequisites

- Google Cloud SDK installed and authenticated
- Access to the `cr-instance` VM in `us-central1-c` zone
- Existing Tormentor server setup (Nginx, SSL, Docker, FastAPI app)

## Setup

1. **Download the script:**
   ```bash
   # Save vm_manager.sh to your local machine or the VM
   chmod +x vm_manager.sh
   ```

2. **Test access:**
   ```bash
   gcloud compute instances list
   # Should show your cr-instance
   ```

## Usage

### Create a Backup
```bash
./vm_manager.sh backup "Optional description"
```
**Example:**
```bash
./vm_manager.sh backup "Working version before frontend changes"
```
**Output:** `Snapshot created: tormentor-20250613-203045`

### List Available Snapshots
```bash
./vm_manager.sh list
```
Shows all your snapshots with creation dates and descriptions.

### Deploy from Snapshot
```bash
./vm_manager.sh deploy [snapshot-name]
```

**With snapshot name:**
```bash
./vm_manager.sh deploy tormentor-20250613-203045
```

**Without snapshot name (interactive):**
```bash
./vm_manager.sh deploy
# Shows list of snapshots and prompts you to choose
```

## What Happens During Deployment

1. ✅ Creates new VM from snapshot
2. ✅ Assigns new IP address  
3. ✅ Automatically restarts Nginx and Docker
4. ✅ Starts your FastAPI application
5. ⚠️ **Manual step required:** Update DNS

## After Deployment

**You need to manually update DNS:**

1. **Note the new IP address** from script output
2. **Go to Namecheap.com** → Domain List → tormentor.dev → Manage
3. **Update A Record:** `api` → change IP to new address
4. **Wait 5-15 minutes** for DNS propagation
5. **Test:** `curl https://api.tormentor.dev/health`

## Example Workflow

```bash
# 1. Create backup before making changes
./vm_manager.sh backup "Before major update"

# 2. Make your changes, test, etc...

# 3. If something breaks, deploy from backup
./vm_manager.sh deploy tormentor-20250613-203045

# 4. Update DNS with new IP
# 5. Your app is restored and working!
```

## Important Notes

- **Snapshots are incremental** - only changes are stored after the first one
- **New VM gets a new IP** - DNS update is always required
- **SSL certificates are preserved** - they'll work once DNS propagates
- **All your code/data is preserved** - complete VM clone
- **Old VMs aren't deleted** - manage them manually if needed

## Troubleshooting

**Script can't find snapshot:**
```bash
./vm_manager.sh list  # Check available snapshots
```

**VM doesn't start services:**
```bash
# SSH into the new VM and manually restart
gcloud compute ssh NEW_VM_NAME --zone=us-central1-c
sudo systemctl restart nginx docker
cd /home/malikmacbook/CRCoach/server && ./startup.sh
```

**DNS not updating:**
- Wait longer (up to 48 hours max)
- Check nslookup: `nslookup api.tormentor.dev`
- Verify A record is correct in Namecheap

## Cost

- **Snapshots:** ~$0.05/GB/month (incremental storage)
- **New VMs:** Standard GCP compute pricing
- **Tip:** Delete old VMs you don't need to save costs