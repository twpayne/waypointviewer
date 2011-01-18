.PHONY: images
images: \
	static/arrow.png \
	static/fullscreen.png \
	static/taskboard.png

%.png: %.pbm
	pnmtopng -transparent white $< > $@
