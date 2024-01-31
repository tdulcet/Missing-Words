#!/bin/bash

# Teal Dulcet
# Update dictionary data
# ./update.sh

set -e

if [[ $# -ne 0 ]]; then
	echo "Usage: $0" >&2
	exit 1
fi

# wget arguments
args=(-nv -T 30 --retry-connrefused --retry-on-host-error -c --content-disposition --compression auto)

# headtail <file>
headtail() {
	head "$1"
	echo "..."
	tail "$1"
}

TEMP=temp.txt

wget "${args[@]}" https://hg.mozilla.org/mozilla-central/raw-file/tip/extensions/spellcheck/locales/en-US/hunspell/en-US.{aff,dic}

unmunch en-US.dic en-US.aff >"$TEMP"

# Convert to UTF-8
iconv -f ISO-8859-1 -t UTF-8 -o mozilla.txt "$TEMP"

rm "$TEMP"

(
	set -e
	trap 'echo "::error::Wiktionary failed to update"' ERR

	DIR=wiktionary
	FILE=kaikki.org-dictionary-English.json
	TEMP=wiktionary.tsv
	OUTPUT='Wiktionary words.tsv'

	echo -e "\nWiktionary\n"

	cd "$DIR"
	echo -e "\n\tDownloading “${FILE}”\n"
	wget "${args[@]}" "https://kaikki.org/dictionary/English/$FILE"

	headtail "$FILE"

	echo -e "\n\tGenerating data “$TEMP”\n"
	python3 -X dev update.py "$FILE" "$TEMP"

	headtail "$TEMP"

	join -t $'\t' <(comm -13 <(tr -cd '[:alnum:]\n' <../mozilla.txt | tr '[:upper:]' '[:lower:]' | sort -u) <(cut -f 1 "$TEMP" | sort)) <(sort -t $'\t' -k 1,1 "$TEMP") | sort -t $'\t' -k 3,3nr >"$OUTPUT"

	sort -t $'\t' -k 3,3nr -o "$TEMP" "$TEMP"
)

(
	shopt -s globstar
	echo "Dictionary data:"
	wc -l -- **/*.tsv
	echo
	du -bch -- **/*.tsv
)
