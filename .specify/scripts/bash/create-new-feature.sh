#!/usr/bin/env bash

set -e

JSON_MODE=false
SHORT_NAME=""
BRANCH_NUMBER=""
USE_TIMESTAMP=false
ARGS=()
i=1
while [ $i -le $# ]; do
    arg="${!i}"
    case "$arg" in
        --json)
            JSON_MODE=true
            ;;
        --short-name)
            if [ $((i + 1)) -gt $# ]; then
                echo 'Error: --short-name requires a value' >&2
                exit 1
            fi
            i=$((i + 1))
            next_arg="${!i}"
            # Check if the next argument is another option (starts with --)
            if [[ "$next_arg" == --* ]]; then
                echo 'Error: --short-name requires a value' >&2
                exit 1
            fi
            SHORT_NAME="$next_arg"
            ;;
        --number)
            if [ $((i + 1)) -gt $# ]; then
                echo 'Error: --number requires a value' >&2
                exit 1
            fi
            i=$((i + 1))
            next_arg="${!i}"
            if [[ "$next_arg" == --* ]]; then
                echo 'Error: --number requires a value' >&2
                exit 1
            fi
            BRANCH_NUMBER="$next_arg"
            ;;
        --timestamp)
            USE_TIMESTAMP=true
            ;;
        --help|-h)
            echo "Usage: $0 [--json] [--short-name <name>] [--number N] [--timestamp] <feature_description>"
            echo ""
            echo "Options:"
            echo "  --json              Output in JSON format"
            echo "  --short-name <name> Provide a custom short name (2-4 words) for the branch"
            echo "  --number N          Specify branch number manually (overrides auto-detection)"
            echo "  --timestamp         Use timestamp prefix (YYYYMMDD-HHMMSS) instead of sequential numbering"
            echo "  --help, -h          Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 'Add user authentication system' --short-name 'user-auth'"
            echo "  $0 'Implement OAuth2 integration for API' --number 5"
            echo "  $0 --timestamp --short-name 'user-auth' 'Add user authentication'"
            exit 0
            ;;
        *)
            ARGS+=("$arg")
            ;;
    esac
    i=$((i + 1))
done

FEATURE_DESCRIPTION="${ARGS[*]}"
if [ -z "$FEATURE_DESCRIPTION" ]; then
    echo "Usage: $0 [--json] [--short-name <name>] [--number N] [--timestamp] <feature_description>" >&2
    exit 1
fi

# Trim whitespace and validate description is not empty (e.g., user passed only whitespace)
FEATURE_DESCRIPTION=$(echo "$FEATURE_DESCRIPTION" | xargs)
if [ -z "$FEATURE_DESCRIPTION" ]; then
    echo "Error: Feature description cannot be empty or contain only whitespace" >&2
    exit 1
fi

# Function to get highest number from specs directory
get_highest_from_specs() {
    local specs_dir="$1"
    local highest=0
    
    if [ -d "$specs_dir" ]; then
        for dir in "$specs_dir"/*; do
            [ -d "$dir" ] || continue
            dirname=$(basename "$dir")
            # Match sequential prefixes (>=3 digits), but skip timestamp dirs.
            if echo "$dirname" | grep -Eq '^[0-9]{3,}-' && ! echo "$dirname" | grep -Eq '^[0-9]{8}-[0-9]{6}-'; then
                number=$(echo "$dirname" | grep -Eo '^[0-9]+')
                number=$((10#$number))
                if [ "$number" -gt "$highest" ]; then
                    highest=$number
                fi
            fi
        done
    fi
    
    echo "$highest"
}

# Function to get highest number from git branches
get_highest_from_branches() {
    local highest=0
    
    # Get all branches (local and remote)
    branches=$(git branch -a 2>/dev/null || echo "")
    
    if [ -n "$branches" ]; then
        while IFS= read -r branch; do
            # Clean branch name: remove leading markers and remote prefixes
            clean_branch=$(echo "$branch" | sed 's/^[* ]*//; s|^remotes/[^/]*/||')
            
            # Extract sequential feature number (>=3 digits), skip timestamp branches.
            if echo "$clean_branch" | grep -Eq '^[0-9]{3,}-' && ! echo "$clean_branch" | grep -Eq '^[0-9]{8}-[0-9]{6}-'; then
                number=$(echo "$clean_branch" | grep -Eo '^[0-9]+' || echo "0")
                number=$((10#$number))
                if [ "$number" -gt "$highest" ]; then
                    highest=$number
                fi
            fi
        done <<< "$branches"
    fi
    
    echo "$highest"
}

# Function to check existing branches (local and remote) and return next available number
check_existing_branches() {
    local specs_dir="$1"

    # Fetch all remotes to get latest branch info (suppress errors if no remotes)
    git fetch --all --prune >/dev/null 2>&1 || true

    # Get highest number from ALL branches (not just matching short name)
    local highest_branch=$(get_highest_from_branches)

    # Get highest number from ALL specs (not just matching short name)
    local highest_spec=$(get_highest_from_specs "$specs_dir")

    # Take the maximum of both
    local max_num=$highest_branch
    if [ "$highest_spec" -gt "$max_num" ]; then
        max_num=$highest_spec
    fi

    # Return next number
    echo $((max_num + 1))
}

# Function to clean and format a branch name
clean_branch_name() {
    local name="$1"
    echo "$name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/^-//' | sed 's/-$//'
}

# Resolve repository root using common.sh functions which prioritize .specify over git
SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

REPO_ROOT=$(get_repo_root)

# Check if git is available at this repo root (not a parent)
if has_git; then
    HAS_GIT=true
else
    HAS_GIT=false
fi

cd "$REPO_ROOT"

SPECS_DIR="$REPO_ROOT/specs"
mkdir -p "$SPECS_DIR"

# Function to generate branch name with stop word filtering and length filtering
generate_branch_name() {
    local description="$1"
    
    # Common stop words to filter out
    local stop_words="^(i|a|an|the|to|for|of|in|on|at|by|with|from|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|should|could|can|may|might|must|shall|this|that|these|those|my|your|our|their|want|need|add|get|set)$"
    
    # Convert to lowercase and split into words
    local clean_name=$(echo "$description" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/ /g')
    
    # Filter words: remove stop words and words shorter than 3 chars (unless they're uppercase acronyms in original)
    local meaningful_words=()
    for word in $clean_name; do
        # Skip empty words
        [ -z "$word" ] && continue
        
        # Keep words that are NOT stop words AND (length >= 3 OR are potential acronyms)
        if ! echo "$word" | grep -qiE "$stop_words"; then
            if [ ${#word} -ge 3 ]; then
                meaningful_words+=("$word")
            elif echo "$description" | grep -q "\b${word^^}\b"; then
                # Keep short words if they appear as uppercase in original (likely acronyms)
                meaningful_words+=("$word")
            fi
        fi
    done
    
    # If we have meaningful words, use first 3-4 of them
    if [ ${#meaningful_words[@]} -gt 0 ]; then
        local max_words=3
        if [ ${#meaningful_words[@]} -eq 4 ]; then max_words=4; fi
        
        local result=""
        local count=0
        for word in "${meaningful_words[@]}"; do
            if [ $count -ge $max_words ]; then break; fi
            if [ -n "$result" ]; then result="$result-"; fi
            result="$result$word"
            count=$((count + 1))
        done
        echo "$result"
    else
        # Fallback to original logic if no meaningful words found
        local cleaned=$(clean_branch_name "$description")
        echo "$cleaned" | tr '-' '\n' | grep -v '^$' | head -3 | tr '\n' '-' | sed 's/-$//'
    fi
}

# Generate branch name
if [ -n "$SHORT_NAME" ]; then
    # Use provided short name, just clean it up
    BRANCH_SUFFIX=$(clean_branch_name "$SHORT_NAME")
else
    # Generate from description with smart filtering
    BRANCH_SUFFIX=$(generate_branch_name "$FEATURE_DESCRIPTION")
fi

# Validate --number input (must be a positive integer) before any mutation.
# Accepts forms that decode to >= 1 in base 10; rejects non-numeric, zero,
# negatives, and leading-zero forms that decode to 0.
if [ -n "$BRANCH_NUMBER" ]; then
    if ! [[ "$BRANCH_NUMBER" =~ ^[0-9]+$ ]] || [ "$((10#$BRANCH_NUMBER))" -lt 1 ]; then
        >&2 echo "Error: --number must be a positive integer (got: '$BRANCH_NUMBER')"
        exit 1
    fi
fi

# Warn if --number and --timestamp are both specified
if [ "$USE_TIMESTAMP" = true ] && [ -n "$BRANCH_NUMBER" ]; then
    >&2 echo "[specify] Warning: --number is ignored when --timestamp is used"
    BRANCH_NUMBER=""
fi

# Detect whether the currently checked-out branch already has a recognised
# feature prefix — if so, reuse it verbatim instead of creating a new branch.
# This is what aligns spec dir + branch + GitHub issue number when
# agent.sh has already created the <N>-<slug> branch for us.
# Recognised prefixes (order matters — timestamp is checked first so its
# leading digit-run isn't greedily consumed by the sequential regex):
#   <YYYYMMDD>-<HHMMSS>-<slug>  — timestamp mode
#   <N>-<slug>                  — issue-driven or legacy sequential (any width)
REUSE_CURRENT_BRANCH=false
CURRENT_BRANCH=""
if [ "$HAS_GIT" = true ] && [ "$USE_TIMESTAMP" = false ] && [ -z "$BRANCH_NUMBER" ]; then
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
    if [[ "$CURRENT_BRANCH" =~ ^([0-9]{8}-[0-9]{6})-.+$ ]]; then
        REUSE_CURRENT_BRANCH=true
        BRANCH_NAME="$CURRENT_BRANCH"
        FEATURE_NUM="${BASH_REMATCH[1]}"
    elif [[ "$CURRENT_BRANCH" =~ ^([0-9]+)-.+$ ]]; then
        REUSE_CURRENT_BRANCH=true
        BRANCH_NAME="$CURRENT_BRANCH"
        FEATURE_NUM="${BASH_REMATCH[1]}"
    fi
fi

# Determine branch prefix (only if we aren't reusing the current branch)
if [ "$REUSE_CURRENT_BRANCH" = false ]; then
    if [ "$USE_TIMESTAMP" = true ]; then
        FEATURE_NUM=$(date +%Y%m%d-%H%M%S)
        BRANCH_NAME="${FEATURE_NUM}-${BRANCH_SUFFIX}"
    else
        # Determine branch number
        if [ -z "$BRANCH_NUMBER" ]; then
            if [ "$HAS_GIT" = true ]; then
                # Check existing branches on remotes
                BRANCH_NUMBER=$(check_existing_branches "$SPECS_DIR")
            else
                # Fall back to local directory check
                HIGHEST=$(get_highest_from_specs "$SPECS_DIR")
                BRANCH_NUMBER=$((HIGHEST + 1))
            fi
        fi

        # Force base-10 interpretation to prevent octal conversion (e.g., 010 → 8 in octal, but should be 10 in decimal)
        FEATURE_NUM=$(printf "%03d" "$((10#$BRANCH_NUMBER))")
        BRANCH_NAME="${FEATURE_NUM}-${BRANCH_SUFFIX}"
    fi
fi

# GitHub enforces a 244-byte limit on branch names
# Validate and truncate if necessary
MAX_BRANCH_LENGTH=244
if [ ${#BRANCH_NAME} -gt $MAX_BRANCH_LENGTH ]; then
    # Calculate how much we need to trim from suffix
    # Account for prefix length: timestamp (15) + hyphen (1) = 16, or sequential (3) + hyphen (1) = 4
    PREFIX_LENGTH=$(( ${#FEATURE_NUM} + 1 ))
    MAX_SUFFIX_LENGTH=$((MAX_BRANCH_LENGTH - PREFIX_LENGTH))
    
    # Truncate suffix at word boundary if possible
    TRUNCATED_SUFFIX=$(echo "$BRANCH_SUFFIX" | cut -c1-$MAX_SUFFIX_LENGTH)
    # Remove trailing hyphen if truncation created one
    TRUNCATED_SUFFIX=$(echo "$TRUNCATED_SUFFIX" | sed 's/-$//')
    
    ORIGINAL_BRANCH_NAME="$BRANCH_NAME"
    BRANCH_NAME="${FEATURE_NUM}-${TRUNCATED_SUFFIX}"
    
    >&2 echo "[specify] Warning: Branch name exceeded GitHub's 244-byte limit"
    >&2 echo "[specify] Original: $ORIGINAL_BRANCH_NAME (${#ORIGINAL_BRANCH_NAME} bytes)"
    >&2 echo "[specify] Truncated to: $BRANCH_NAME (${#BRANCH_NAME} bytes)"
fi

if [ "$HAS_GIT" = true ]; then
    if [ "$REUSE_CURRENT_BRANCH" = true ]; then
        # The branch was already created and checked out (e.g. by agent.sh).
        # Nothing to do — reusing verbatim is the whole point of this path.
        :
    elif ! git checkout -b "$BRANCH_NAME" 2>/dev/null; then
        # Check if branch already exists
        if git branch --list "$BRANCH_NAME" | grep -q .; then
            if [ "$USE_TIMESTAMP" = true ]; then
                >&2 echo "Error: Branch '$BRANCH_NAME' already exists. Rerun to get a new timestamp or use a different --short-name."
            else
                >&2 echo "Error: Branch '$BRANCH_NAME' already exists but is not the currently checked-out branch."
                >&2 echo "Accepted feature-branch forms: <N>-<slug>, <YYYYMMDD>-<HHMMSS>-<slug>."
                >&2 echo "Resolution: check out '$BRANCH_NAME' to reuse it, delete it, or pick a different --number/--short-name."
            fi
            exit 1
        else
            >&2 echo "Error: Failed to create git branch '$BRANCH_NAME'. Please check your git configuration and try again."
            exit 1
        fi
    fi
else
    >&2 echo "[specify] Warning: Git repository not detected; skipped branch creation for $BRANCH_NAME"
fi

FEATURE_DIR="$SPECS_DIR/$BRANCH_NAME"
SPEC_FILE="$FEATURE_DIR/spec.md"

# Collision check: if the target spec directory already has a populated
# spec.md, refuse rather than overwrite. An empty or missing spec.md (e.g.
# from a prior partial run) is fine — we fall through and write the template.
if [ -s "$SPEC_FILE" ]; then
    >&2 echo "Error: $SPEC_FILE already exists and is non-empty."
    >&2 echo "Resolution: rename or remove $FEATURE_DIR, or run /speckit.specify for a different feature."
    exit 1
fi

mkdir -p "$FEATURE_DIR"

TEMPLATE=$(resolve_template "spec-template" "$REPO_ROOT") || true
if [ -n "$TEMPLATE" ] && [ -f "$TEMPLATE" ]; then
    cp "$TEMPLATE" "$SPEC_FILE"
else
    echo "Warning: Spec template not found; created empty spec file" >&2
    touch "$SPEC_FILE"
fi

# Inform the user how to persist the feature variable in their own shell
printf '# To persist: export SPECIFY_FEATURE=%q\n' "$BRANCH_NAME" >&2

if $JSON_MODE; then
    if command -v jq >/dev/null 2>&1; then
        jq -cn \
            --arg branch_name "$BRANCH_NAME" \
            --arg spec_file "$SPEC_FILE" \
            --arg feature_num "$FEATURE_NUM" \
            '{BRANCH_NAME:$branch_name,SPEC_FILE:$spec_file,FEATURE_NUM:$feature_num}'
    else
        printf '{"BRANCH_NAME":"%s","SPEC_FILE":"%s","FEATURE_NUM":"%s"}\n' "$(json_escape "$BRANCH_NAME")" "$(json_escape "$SPEC_FILE")" "$(json_escape "$FEATURE_NUM")"
    fi
else
    echo "BRANCH_NAME: $BRANCH_NAME"
    echo "SPEC_FILE: $SPEC_FILE"
    echo "FEATURE_NUM: $FEATURE_NUM"
    printf '# To persist in your shell: export SPECIFY_FEATURE=%q\n' "$BRANCH_NAME"
fi
