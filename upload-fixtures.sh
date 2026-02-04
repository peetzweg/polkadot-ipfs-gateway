#!/bin/bash

# Upload and pin fixtures to local Kubo IPFS node
# Usage: ./upload-fixtures.sh [fixtures_directory]
#
# IMPORTANT: This script preserves the exact CID generation logic from fixtures.ts:
#   - Individual .json files: blake2b-256 hash + json codec (0x0200)
#   - Individual .js files:   blake2b-256 hash + raw codec (0x0055)
#   - Directories:            Standard UnixFS (dag-pb + sha2-256)
#
# Prerequisites:
#   - Local Kubo node running (ipfs daemon)
#   - ipfs CLI available in PATH

# Don't use set -e as we handle errors manually

# Default fixtures directory (relative to script location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURES_DIR="${1:-$SCRIPT_DIR/fixtures}"

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
    echo "Usage: $0 [fixtures_directory]"
    echo "  Default: ./fixtures"
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
                echo -e "  ${GREEN}✓${NC} $filename (json + blake2b-256, $(format_size $filesize))"
                echo "    CID: $cid"
                FILES_PASSED=$((FILES_PASSED + 1))
                PASSED_ITEMS+=("$filename -> $cid")
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
                echo -e "  ${GREEN}✓${NC} $filename (raw + blake2b-256, $(format_size $filesize))"
                echo "    CID: $cid"
                FILES_PASSED=$((FILES_PASSED + 1))
                PASSED_ITEMS+=("$filename -> $cid")
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
            echo -e "  ${GREEN}✓${NC} $dirname/ (UnixFS dag-pb + sha2-256)"
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

            DIRS_PASSED=$((DIRS_PASSED + 1))
            PASSED_ITEMS+=("$dirname/ -> $cid")
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
echo "Verification commands:"
echo "  List pins:        ipfs pin ls --type=recursive"
echo "  Get block:        ipfs block get <CID>"
echo "  Cat content:      ipfs cat <CID>"
echo "  Via gateway:      http://localhost:8080/ipfs/<CID>"
echo "=========================================="

# Exit with error code if there were failures
if [ $TOTAL_FAILED -gt 0 ]; then
    exit 1
fi

exit 0
