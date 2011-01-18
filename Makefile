.PHONY: images
images: \
	static/fullscreen.png \
	static/taskboard.png

%.png: %.pbm
	pnmtopng -transparent white $< > $@
