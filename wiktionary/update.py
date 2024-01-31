#!/usr/bin/env python3
# Teal Dulcet

# Run: python3 update.py <input JSON file> <output TSV file>

# export LC_ALL=C.UTF-8

# sudo apt update
# sudo apt install hunspell-tools

# wget --compression auto https://hg.mozilla.org/mozilla-central/raw-file/tip/extensions/spellcheck/locales/en-US/hunspell/en-US.{aff,dic}
# unmunch en-US.dic en-US.aff > temp.txt
# # Convert 'mozilla.txt' to UTF-8
# iconv -f ISO-8859-1 -t UTF-8 -o mozilla.txt temp.txt

# wget --compression auto https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.json
# time python3 -X dev update.py kaikki.org-dictionary-English.json wiktionary.tsv

# join -t $'\t' <(comm -13 <(tr -cd '[:alnum:]\n' < mozilla.txt | tr '[:upper:]' '[:lower:]' | sort -u) <(cut -f 1 wiktionary.tsv | sort)) <(sort -t $'\t' -k 1,1 wiktionary.tsv) | sort -t $'\t' -k 3,3nr > 'Wiktionary words.tsv'

import csv
import io
import json
import re
import sys
import time
from collections import Counter
from datetime import timedelta

if len(sys.argv) != 3:
	print(f"Usage: {sys.argv[0]} <input JSON file> <output TSV file>", file=sys.stderr)
	sys.exit(1)

# Allowed Parts of speech
parts_of_speech = frozenset(["noun", "verb", "adj", "adv", "prep_phrase",
							 "abbrev", "pron", "prep", "num", "conj", "det", "particle", "postp", "intj"])

# Allowed words and forms
# pattern = re.compile(r"^[\w'-]+$")
pattern = re.compile(r"^[\S]+$")
apattern = re.compile(r"[\W_]+")


def output(temp):
	aoutput = io.StringIO()
	writer = csv.writer(aoutput)
	writer.writerow(temp)
	return aoutput.getvalue().rstrip()


n = 10

awords = set()
words = {}
senses = {}
poss = {}
wikis = {}
forms = {}

keys = Counter()
part = Counter()
langs = Counter()
sources = Counter()
categories = Counter()
parents = Counter()
sense_keys = Counter()
sense_tags = Counter()
form_keys = Counter()
form_tags = Counter()
form_sources = Counter()

start = time.perf_counter()

with open(sys.argv[1], encoding="utf-8") as f:
	for line in f:
		data = json.loads(line)

		keys.update(data.keys())

		word = data["word"]
		aword = apattern.sub("", word).casefold()
		pos = data["pos"]
		asenses = data["senses"]

		part.update([pos])

		langs.update([(data["lang_code"], data["lang"])])

		if "source" in data:
			sources.update([data["source"]])

		if "categories" in data:
			for category in data["categories"]:
				categories.update([category["name"]])
				parents.update(category["parents"])

		if not pattern.match(word) or not pattern.match(aword):
			continue

		if pos not in parts_of_speech:
			continue

		for sense in asenses:
			sense_keys.update(sense.keys())
			if "tags" in sense:
				sense_tags.update(sense["tags"])

		# US, UK, Scotland, Britain, Australia, Canada, India, New-Zealand, Ireland, Northern-England, South-Africa, Philippines, British, Singapore, English, Southern-US, Jamaica, Malaysia, Greek, Africa, South-Asia, Hawaii, Nigeria, England, Pakistan, Appalachia, Hong-Kong, Roman, Commonwealth, Northern-Ireland, New-England, Japanese, Trinidad-and-Tobago, Canadian, Wales, Indonesia, Australian
		if all("tags" in s and (not {"obsolete", "archaic", "misspelling", "nonstandard"}.isdisjoint(s["tags"]) or (
				not {"UK", "Britain", "British", "Commonwealth", "England", "Australia", "Australian", "Canada", "Canadian"}.isdisjoint(s["tags"]) and "US" not in s["tags"])) for s in asenses):
			# print(f"Skiping: {word}, {pos}")
			continue

		if aword not in awords:
			words[aword] = set()
			senses[aword] = 0
			poss[aword] = set()
			wikis[aword] = set()
			forms[aword] = set()
		awords.add(aword)
		words[aword].add(word)
		senses[aword] += sum(1 for s in asenses if "glosses" in s)
		poss[aword].add(pos)
		if "wikipedia" in data:
			wikis[aword].update(data["wikipedia"])

		if "forms" in data:
			for aform in data["forms"]:
				form_keys.update(aform.keys())
				if "tags" in aform:
					form_tags.update(aform["tags"])
				if "source" in aform:
					form_sources.update([aform["source"]])

				form = aform["form"]
				temp = form.strip()
				if form != temp:
					print(f"Error: {form!r}", aform)
					form = temp
				if ("tags" not in aform or {"inflection-template", "table-tags", "class", "British", "Canada",
											"Australian"}.isdisjoint(aform["tags"])) and form and form != "-" and pattern.match(form):
					# aaform = apattern.sub('', form).lower()
					# if aaform not in awords:
						# poss[aaform] = set()
						# wikis[aaform] = set()
					# awords.add(aaform)
					# words[aaform].add(form)
					# poss[aaform].add(pos)
					# if "wikipedia" in data:
						# wikis[aaform].update(data["wikipedia"])

					forms[aword].add(form)

end = time.perf_counter()
print(f"Total number of Keys: {len(awords):n}, Total number of Words: {sum(len(word) for word in words.values()):n}, Runtime: {timedelta(seconds=end - start)}")

with open(sys.argv[2], "w", newline="", encoding="utf-8") as csvfile:
	writer = csv.writer(csvfile, delimiter="\t", lineterminator="\n", quotechar=None, quoting=csv.QUOTE_NONE)
	# writer.writerow(["key", "word(s)", "senses", "form(s)", "part(s) of speech", "Wikipedia page(s)"])
	for aword in sorted(awords):
		writer.writerow([aword, output(sorted(words[aword])), senses[aword], output(sorted(forms[aword])) if forms[aword] else "", output(sorted(poss[aword])), output(sorted(wikis[aword])) if aword in wikis else ""])

print("\nCounts\n")
print("Keys:", len(keys))
print("\n".join(f"\t{count}\t{key!r}" for key, count in keys.most_common()))

print("Part-of-speech:", len(part))
print("\n".join(f"\t{count}\t{pos}" for pos, count in part.most_common()))

print("Languages:", len(langs))
print("\n".join(f"\t{count}\t{lang}" for lang, count in langs.most_common()))

print("Sources:", len(sources))
print("\n".join(f"\t{count}\t{source}" for source, count in sources.most_common()))

print("Categories (names):", len(categories))
print("\n".join(f"\t{count}\t{category}" for category, count in categories.most_common(n)))

print("Categories (parents):", len(parents))
print("\n".join(f"\t{count}\t{category}" for category, count in parents.most_common(n)))

print("Sense Keys:", len(sense_keys))
print("\n".join(f"\t{count}\t{key!r}" for key, count in sense_keys.most_common()))

print("Sense Tags:", len(sense_tags))
print("\n".join(f"\t{count}\t{tag}" for tag, count in sense_tags.most_common(n * n)))

print("Form Keys:", len(form_keys))
print("\n".join(f"\t{count}\t{key!r}" for key, count in form_keys.most_common()))

print("Form Tags:", len(form_tags))
print("\n".join(f"\t{count}\t{tag}" for tag, count in form_tags.most_common(2 * n)))

print("Form Sources:", len(form_sources))
print("\n".join(f"\t{count}\t{source}" for source, count in form_sources.most_common()))
