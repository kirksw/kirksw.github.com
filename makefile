serve:
	cd hugo && hugo -D server

build:
	rm -rf docs/*
	cd hugo && hugo
	cp -r hugo/public/* docs/
