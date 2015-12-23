all: jolly-roger.json

%.json: %.yaml
	ruby -ryaml -rjson -e "puts JSON.dump(YAML.load(ARGF))" < $< > $@
