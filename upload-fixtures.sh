#!/bin/bash

# Upload and pin fixtures to local Kubo IPFS node
# Usage: ./upload-fixtures.sh [fixtures_directory] [--verify-only]
#
# Modes:
#   ./upload-fixtures.sh              - Upload and pin all fixtures
#   ./upload-fixtures.sh --verify     - Verify existing pins from manifest
#   ./upload-fixtures.sh --diagnose   - Show detailed IPFS node diagnostics
#
# IMPORTANT: This script preserves the exact CID generation logic from fixtures.ts:
#   - Individual .json files: blake2b-256 hash + json codec (0x0200)
#   - Individual .js files:   blake2b-256 hash + raw codec (0x0055)
#   - Directories:            Standard UnixFS (dag-pb + sha2-256)
#
# Prerequisites:
#   - Local Kubo node running (ipfs daemon)
#   - ipfs CLI available in PATH
#
# Manifest File:
#   Creates .ipfs-pins-manifest.txt to track all pinned CIDs

# Don't use set -e as we handle errors manually

# Default fixtures directory (relative to script location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST_FILE="$SCRIPT_DIR/.ipfs-pins-manifest.txt"

# Parse arguments
MODE="upload"
FIXTURES_DIR=""

for arg in "$@"; do
    case $arg in
        --verify)
            MODE="verify"
            shift
            ;;
        --diagnose)
            MODE="diagnose"
            shift
            ;;
        *)
            if [ -z "$FIXTURES_DIR" ]; then
                FIXTURES_DIR="$arg"
            fi
            ;;
    esac
done

# Set default fixtures dir if not provided
FIXTURES_DIR="${FIXTURES_DIR:-$SCRIPT_DIR/fixtures}"

# Max block size for standard bitswap (1MB)
MAX_BLOCK_SIZE=1048576

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Counters for summary
FILES_PASSED=0
FILES_FAILED=0
FILES_SKIPPED_SIZE=0
FILES_SKIPPED_EXT=0
DIRS_PASSED=0
DIRS_FAILED=0

# Arrays for detailed summary
declare -a PASSED_ITEMS=()
declare -a FAILED_ITEMS=()
declare -a SKIPPED_SIZE_ITEMS=()
declare -a SKIPPED_EXT_ITEMS=()
declare -a PINNED_CIDS=()  # Track CIDs for manifest

# Helper function to verify a pin exists and is accessible
verify_pin() {
    local cid="$1"
    local item_name="$2"
    
    # Check if pin exists
    if ! ipfs pin ls --type=recursive 2>/dev/null | grep -q "^$cid"; then
        echo -e "  ${RED}✗ CRITICAL${NC} $item_name ($cid) - PIN MISSING!"
        return 1
    fi
    
    # Try to stat the CID (ensures it's actually retrievable)
    if ! ipfs block stat "$cid" &>/dev/null; then
        echo -e "  ${RED}✗ CRITICAL${NC} $item_name ($cid) - BLOCK INACCESSIBLE!"
        return 1
    fi
    
    return 0
}

# Helper function to save CID to manifest
save_to_manifest() {
    local cid="$1"
    local item_name="$2"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "$timestamp|$cid|$item_name" >> "$MANIFEST_FILE"
    PINNED_CIDS+=("$cid|$item_name")
}

# Diagnostic mode function
run_diagnostics() {
    echo "=========================================="
    echo "IPFS Node Diagnostics"
    echo "=========================================="
    echo ""
    
    # IPFS version and config
    echo -e "${CYAN}IPFS Version:${NC}"
    ipfs version --all 2>/dev/null || ipfs version
    echo ""
    
    # Repository info
    echo -e "${CYAN}Repository Path:${NC}"
    ipfs config show 2>/dev/null | grep "IPFS_PATH" || echo "$IPFS_PATH"
    echo ""
    
    # Repo stats
    echo -e "${CYAN}Repository Stats:${NC}"
    ipfs repo stat 2>/dev/null
    echo ""
    
    # Pin stats
    echo -e "${CYAN}Pin Statistics:${NC}"
    local recursive_pins=$(ipfs pin ls --type=recursive 2>/dev/null | wc -l | tr -d ' ')
    local direct_pins=$(ipfs pin ls --type=direct 2>/dev/null | wc -l | tr -d ' ')
    local indirect_pins=$(ipfs pin ls --type=indirect 2>/dev/null | wc -l | tr -d ' ')
    echo "  Recursive pins: $recursive_pins"
    echo "  Direct pins:    $direct_pins"
    echo "  Indirect pins:  $indirect_pins"
    echo ""
    
    # GC status
    echo -e "${CYAN}Garbage Collection:${NC}"
    ipfs config Datastore.GCPeriod 2>/dev/null || echo "  (default settings)"
    echo ""
    
    # Check manifest
    if [ -f "$MANIFEST_FILE" ]; then
        echo -e "${CYAN}Manifest File Found:${NC} $MANIFEST_FILE"
        local manifest_count=$(wc -l < "$MANIFEST_FILE" | tr -d ' ')
        echo "  Entries: $manifest_count"
        echo ""
        
        echo "Verifying manifest pins..."
        local missing=0
        while IFS='|' read -r timestamp cid item_name; do
            if ipfs pin ls --type=recursive 2>/dev/null | grep -q "^$cid"; then
                echo -e "  ${GREEN}✓${NC} $item_name ($cid)"
            else
                echo -e "  ${RED}✗ MISSING${NC} $item_name ($cid)"
                missing=$((missing + 1))
            fi
        done < "$MANIFEST_FILE"
        
        echo ""
        if [ $missing -eq 0 ]; then
            echo -e "${GREEN}${BOLD}All manifest pins verified!${NC}"
        else
            echo -e "${RED}${BOLD}WARNING: $missing pins are missing!${NC}"
            echo "Consider re-uploading fixtures."
        fi
    else
        echo -e "${YELLOW}No manifest file found${NC}"
        echo "Run upload mode to create manifest"
    fi
    
    echo ""
    echo "=========================================="
    exit 0
}

# Verify-only mode function
run_verify() {
    echo "=========================================="
    echo "Verifying Pinned Fixtures"
    echo "=========================================="
    echo ""
    
    if [ ! -f "$MANIFEST_FILE" ]; then
        echo -e "${RED}Error: Manifest file not found: $MANIFEST_FILE${NC}"
        echo "Run upload mode first to create manifest"
        exit 1
    fi
    
    echo "Reading manifest: $MANIFEST_FILE"
    echo ""
    
    local total=0
    local verified=0
    local missing=0
    
    while IFS='|' read -r timestamp cid item_name; do
        total=$((total + 1))
        if verify_pin "$cid" "$item_name"; then
            echo -e "  ${GREEN}✓${NC} $item_name"
            verified=$((verified + 1))
        else
            missing=$((missing + 1))
        fi
    done < "$MANIFEST_FILE"
    
    echo ""
    echo "=========================================="
    echo -e "${BOLD}Verification Summary${NC}"
    echo "=========================================="
    echo -e "  ${GREEN}Verified:${NC} $verified"
    echo -e "  ${RED}Missing:${NC}  $missing"
    echo "  Total:    $total"
    echo ""
    
    if [ $missing -gt 0 ]; then
        echo -e "${RED}${BOLD}WARNING: Some pins are missing!${NC}"
        echo "Possible causes:"
        echo "  - IPFS repo was garbage collected"
        echo "  - Different IPFS instance (check IPFS_PATH)"
        echo "  - Datastore corruption"
        echo ""
        echo "Run with --diagnose for detailed node info"
        exit 1
    else
        echo -e "${GREEN}${BOLD}All pins verified successfully!${NC}"
    fi
    
    exit 0
}

# Helper function to format file size (no bc dependency)
format_size() {
    local size=$1
    if [ "$size" -ge 1048576 ]; then
        echo "$((size / 1048576))MB"
    elif [ "$size" -ge 1024 ]; then
        echo "$((size / 1024))KB"
    else
        echo "${size}B"
    fi
}

# Handle special modes
if [ "$MODE" = "diagnose" ]; then
    run_diagnostics
elif [ "$MODE" = "verify" ]; then
    run_verify
fi

# ========================================
# UPLOAD MODE (default)
# ========================================

echo "=========================================="
echo "IPFS Fixture Uploader for Kubo"
echo "=========================================="
echo ""
echo -e "${CYAN}Using correct hashers and codecs:${NC}"
echo "  .json files → blake2b-256 + json codec (0x0200)"
echo "  .js files   → blake2b-256 + raw codec (0x0055)"
echo "  directories → UnixFS (dag-pb + sha2-256)"
echo ""
echo -e "${CYAN}Block size limit:${NC} 1MB (files larger will be skipped)"
echo ""
echo -e "${GREEN}${BOLD}All content will be PINNED (permanent storage)${NC}"
echo -e "${CYAN}Manifest file:${NC} $MANIFEST_FILE"
echo ""

# Initialize/clear manifest file
echo "# IPFS Pins Manifest - Generated $(date)" > "$MANIFEST_FILE"
echo "# Format: timestamp|CID|item_name" >> "$MANIFEST_FILE"

# Check if ipfs CLI is available
if ! command -v ipfs &> /dev/null; then
    echo -e "${RED}Error: ipfs CLI not found in PATH${NC}"
    echo "Please install Kubo and ensure 'ipfs' is in your PATH"
    exit 1
fi

# Check if IPFS daemon is running
if ! ipfs swarm peers &> /dev/null 2>&1; then
    echo -e "${YELLOW}Warning: Cannot connect to IPFS swarm (might be offline mode)${NC}"
    # Try a simpler check
    if ! ipfs id &> /dev/null 2>&1; then
        echo -e "${RED}Error: IPFS daemon doesn't seem to be running${NC}"
        echo "Start it with: ipfs daemon"
        exit 1
    fi
fi

echo -e "${GREEN}✓ IPFS daemon is running${NC}"
echo ""

# Check if fixtures directory exists
if [ ! -d "$FIXTURES_DIR" ]; then
    echo -e "${RED}Error: Fixtures directory not found: $FIXTURES_DIR${NC}"
    echo ""
    echo "Usage: $0 [fixtures_directory] [--verify|--diagnose]"
    echo ""
    echo "Modes:"
    echo "  $0                    - Upload and pin all fixtures (default)"
    echo "  $0 --verify           - Verify existing pins from manifest"
    echo "  $0 --diagnose         - Show detailed IPFS node diagnostics"
    echo ""
    echo "Examples:"
    echo "  $0                    # Upload from ./fixtures"
    echo "  $0 /path/to/fixtures  # Upload from custom path"
    echo "  $0 --verify           # Check if all pins still exist"
    exit 1
fi

echo "Fixtures directory: $FIXTURES_DIR"
echo ""
echo "Uploading and pinning fixtures..."
echo "=========================================="

# Helper function to get file size (cross-platform)
get_file_size() {
    local file="$1"
    # Try Linux stat first, then macOS stat
    if stat --version &>/dev/null 2>&1; then
        # GNU stat (Linux)
        stat -c%s "$file" 2>/dev/null
    else
        # BSD stat (macOS)
        stat -f%z "$file" 2>/dev/null
    fi
}

# Helper function to format file size (no bc dependency)
format_size() {
    local size=$1
    if [ "$size" -ge 1048576 ]; then
        echo "$((size / 1048576))MB"
    elif [ "$size" -ge 1024 ]; then
        echo "$((size / 1024))KB"
    else
        echo "${size}B"
    fi
}

# Process individual .json and .js files with correct hasher/codec
echo ""
echo "Processing individual files (blake2b-256):"
echo "-------------------------------------------"

for file in "$FIXTURES_DIR"/*; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        filesize=$(get_file_size "$file")

        # Skip if we couldn't get file size
        if [ -z "$filesize" ]; then
            echo -e "  ${RED}✗${NC} $filename - FAILED (couldn't determine file size)"
            FILES_FAILED=$((FILES_FAILED + 1))
            FAILED_ITEMS+=("$filename: couldn't determine file size")
            continue
        fi

        if [[ "$filename" == *.json ]]; then
            # Check file size
            if [ "$filesize" -gt "$MAX_BLOCK_SIZE" ]; then
                echo -e "  ${YELLOW}⊘${NC} $filename - SKIPPED ($(format_size $filesize) > 1MB limit)"
                echo "    File too large for single block transfer via bitswap"
                FILES_SKIPPED_SIZE=$((FILES_SKIPPED_SIZE + 1))
                SKIPPED_SIZE_ITEMS+=("$filename ($(format_size $filesize))")
                continue
            fi

            # JSON files: blake2b-256 hash + json codec (0x0200)
            cid=$(ipfs block put --pin --mhtype=blake2b-256 --cid-codec=json "$file" 2>&1)
            exit_code=$?

            if [ $exit_code -eq 0 ]; then
                # Verify the pin was actually created
                if verify_pin "$cid" "$filename"; then
                    echo -e "  ${GREEN}✓${NC} $filename (json + blake2b-256, $(format_size $filesize)) ${GREEN}[PINNED✓]${NC}"
                    echo "    CID: $cid"
                    save_to_manifest "$cid" "$filename"
                    FILES_PASSED=$((FILES_PASSED + 1))
                    PASSED_ITEMS+=("$filename -> $cid")
                else
                    echo -e "  ${RED}✗${NC} $filename - PIN VERIFICATION FAILED"
                    echo "    CID: $cid (uploaded but NOT pinned!)"
                    FILES_FAILED=$((FILES_FAILED + 1))
                    FAILED_ITEMS+=("$filename: pin verification failed")
                fi
            else
                echo -e "  ${RED}✗${NC} $filename - FAILED"
                echo "    Error: $cid"
                FILES_FAILED=$((FILES_FAILED + 1))
                FAILED_ITEMS+=("$filename: $cid")
            fi

        elif [[ "$filename" == *.js ]]; then
            # Check file size
            if [ "$filesize" -gt "$MAX_BLOCK_SIZE" ]; then
                echo -e "  ${YELLOW}⊘${NC} $filename - SKIPPED ($(format_size $filesize) > 1MB limit)"
                echo "    File too large for single block transfer via bitswap"
                FILES_SKIPPED_SIZE=$((FILES_SKIPPED_SIZE + 1))
                SKIPPED_SIZE_ITEMS+=("$filename ($(format_size $filesize))")
                continue
            fi

            # JS files: blake2b-256 hash + raw codec (0x0055)
            cid=$(ipfs block put --pin --mhtype=blake2b-256 --cid-codec=raw "$file" 2>&1)
            exit_code=$?

            if [ $exit_code -eq 0 ]; then
                # Verify the pin was actually created
                if verify_pin "$cid" "$filename"; then
                    echo -e "  ${GREEN}✓${NC} $filename (raw + blake2b-256, $(format_size $filesize)) ${GREEN}[PINNED✓]${NC}"
                    echo "    CID: $cid"
                    save_to_manifest "$cid" "$filename"
                    FILES_PASSED=$((FILES_PASSED + 1))
                    PASSED_ITEMS+=("$filename -> $cid")
                else
                    echo -e "  ${RED}✗${NC} $filename - PIN VERIFICATION FAILED"
                    echo "    CID: $cid (uploaded but NOT pinned!)"
                    FILES_FAILED=$((FILES_FAILED + 1))
                    FAILED_ITEMS+=("$filename: pin verification failed")
                fi
            else
                echo -e "  ${RED}✗${NC} $filename - FAILED"
                echo "    Error: $cid"
                FILES_FAILED=$((FILES_FAILED + 1))
                FAILED_ITEMS+=("$filename: $cid")
            fi
        else
            echo -e "  ${YELLOW}–${NC} $filename - SKIPPED (not .json or .js)"
            FILES_SKIPPED_EXT=$((FILES_SKIPPED_EXT + 1))
            SKIPPED_EXT_ITEMS+=("$filename")
        fi
    fi
done

# Process directories using standard UnixFS (dag-pb + sha2-256)
echo ""
echo "Processing directories (UnixFS):"
echo "---------------------------------"

for dir in "$FIXTURES_DIR"/*; do
    if [ -d "$dir" ]; then
        dirname=$(basename "$dir")

        # Skip hidden directories
        if [[ "$dirname" == .* ]]; then
            continue
        fi

        # Add directory recursively with UnixFS (standard ipfs add)
        # This matches the unixFS.addAll() behavior in fixtures.ts
        result=$(ipfs add -r -Q --pin "$dir" 2>&1)
        exit_code=$?

        if [ $exit_code -eq 0 ]; then
            cid="$result"
            # Verify the pin was actually created
            if verify_pin "$cid" "$dirname/"; then
                echo -e "  ${GREEN}✓${NC} $dirname/ (UnixFS dag-pb + sha2-256) ${GREEN}[PINNED✓]${NC}"
                echo "    CID: $cid"

                # List contents (first few files)
                echo "    Contents:"
                ipfs ls "$cid" 2>/dev/null | head -5 | while read -r line; do
                    echo "      - $line"
                done
                file_count=$(ipfs ls "$cid" 2>/dev/null | wc -l | tr -d ' ')
                if [ "$file_count" -gt 5 ]; then
                    remaining=$((file_count - 5))
                    echo "      ... and $remaining more files"
                fi

                save_to_manifest "$cid" "$dirname/"
                DIRS_PASSED=$((DIRS_PASSED + 1))
                PASSED_ITEMS+=("$dirname/ -> $cid")
            else
                echo -e "  ${RED}✗${NC} $dirname/ - PIN VERIFICATION FAILED"
                echo "    CID: $cid (uploaded but NOT pinned!)"
                DIRS_FAILED=$((DIRS_FAILED + 1))
                FAILED_ITEMS+=("$dirname/: pin verification failed")
            fi
        else
            echo -e "  ${RED}✗${NC} $dirname/ - FAILED"
            echo "    Error: $result"
            DIRS_FAILED=$((DIRS_FAILED + 1))
            FAILED_ITEMS+=("$dirname/: $result")
        fi
    fi
done

# Calculate totals
TOTAL_PASSED=$((FILES_PASSED + DIRS_PASSED))
TOTAL_FAILED=$((FILES_FAILED + DIRS_FAILED))
TOTAL_SKIPPED=$((FILES_SKIPPED_SIZE + FILES_SKIPPED_EXT))
TOTAL=$((TOTAL_PASSED + TOTAL_FAILED + TOTAL_SKIPPED))

# Verify pins (only if we have successfully uploaded items)
if [ $TOTAL_PASSED -gt 0 ]; then
    echo ""
    echo "Verifying pins:"
    echo "---------------"
    
    # Count recursive pins (these are the ones we care about)
    pin_count=$(ipfs pin ls --type=recursive 2>/dev/null | wc -l | tr -d ' ')
    
    if [ -n "$pin_count" ] && [ "$pin_count" -gt 0 ]; then
        echo -e "  ${GREEN}✓${NC} Found $pin_count pinned items (recursive pins)"
        echo ""
        echo "  Sample of pinned CIDs:"
        ipfs pin ls --type=recursive 2>/dev/null | head -5 | while read -r cid pin_type; do
            echo "    📌 $cid"
        done
        if [ "$pin_count" -gt 5 ]; then
            remaining=$((pin_count - 5))
            echo "    ... and $remaining more"
        fi
    else
        echo -e "  ${YELLOW}⚠${NC} No recursive pins found (unexpected)"
    fi
fi

echo ""
echo "=========================================="
echo -e "${BOLD}Test Summary${NC}"
echo "=========================================="
echo ""

# Status line (like test runners)
if [ $TOTAL_FAILED -eq 0 ] && [ $FILES_SKIPPED_SIZE -eq 0 ]; then
    echo -e "${GREEN}${BOLD}All items processed successfully!${NC}"
elif [ $TOTAL_FAILED -eq 0 ]; then
    echo -e "${YELLOW}${BOLD}Completed with skipped items${NC}"
else
    echo -e "${RED}${BOLD}Completed with failures${NC}"
fi
echo ""

# Summary counts
echo -e "  ${GREEN}Passed:${NC}  $TOTAL_PASSED ($FILES_PASSED files, $DIRS_PASSED directories)"
echo -e "  ${RED}Failed:${NC}  $TOTAL_FAILED ($FILES_FAILED files, $DIRS_FAILED directories)"
echo -e "  ${YELLOW}Skipped:${NC} $TOTAL_SKIPPED ($FILES_SKIPPED_SIZE too large, $FILES_SKIPPED_EXT wrong extension)"
echo ""
echo "  Total:   $TOTAL items"

# Detailed sections for non-empty categories
if [ ${#FAILED_ITEMS[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}Failed Items:${NC}"
    for item in "${FAILED_ITEMS[@]}"; do
        echo "  ✗ $item"
    done
fi

if [ ${#SKIPPED_SIZE_ITEMS[@]} -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}Skipped (too large for single block):${NC}"
    for item in "${SKIPPED_SIZE_ITEMS[@]}"; do
        echo "  ⊘ $item"
    done
    echo ""
    echo -e "  ${CYAN}Note:${NC} Files > 1MB can't be transferred via standard bitswap as single blocks."
    echo "  Consider chunking these files or using 'ipfs add' with UnixFS instead."
fi

echo ""
echo "=========================================="
echo "Pin Management & Verification:"
echo "  Verify all pins:  ./upload-fixtures.sh --verify"
echo "  Check node info:  ./upload-fixtures.sh --diagnose"
echo "  List all pins:    ipfs pin ls --type=recursive"
echo "  Verify pin:       ipfs pin verify <CID>"
echo "  Unpin (if needed): ipfs pin rm <CID>"
echo ""
echo "Content Access:"
echo "  Get block:        ipfs block get <CID>"
echo "  Cat content:      ipfs cat <CID>"
echo "  Via gateway:      http://localhost:8080/ipfs/<CID>"
echo ""
echo -e "${GREEN}${BOLD}Manifest saved:${NC} $MANIFEST_FILE"
echo -e "  ${CYAN}→${NC} Contains all CIDs for verification"
echo -e "  ${CYAN}→${NC} Run ${BOLD}--verify${NC} to check if pins still exist"
echo ""
echo -e "${GREEN}${BOLD}Note:${NC} All uploaded content is ${BOLD}PINNED${NC} and will ${BOLD}NOT${NC} be"
echo "      garbage collected. Your fixtures are permanently stored!"
echo ""
echo -e "${YELLOW}${BOLD}Protect your data:${NC}"
echo "  - Backup manifest file to track your pins"
echo "  - Run ${BOLD}--verify${NC} regularly to ensure pins exist"
echo "  - Disable auto-GC: ipfs config Datastore.GCPeriod 0"
echo "=========================================="

# Exit with error code if there were failures
if [ $TOTAL_FAILED -gt 0 ]; then
    exit 1
fi

exit 0
