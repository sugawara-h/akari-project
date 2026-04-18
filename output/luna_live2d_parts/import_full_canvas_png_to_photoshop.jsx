// Photoshop JSX: import Luna Live2D full-canvas PNGs as named layers.
// Run from Photoshop: File > Scripts > Browse...

var sourceFolder = Folder("/Users/hiroto/akari-project/output/luna_live2d_parts/full_canvas_png");
var manifestFile = File("/Users/hiroto/akari-project/output/luna_live2d_parts/parts_manifest.json");

function readText(file) {
  file.open("r");
  var text = file.read();
  file.close();
  return text;
}

function placePngAsLayer(file, layerName) {
  var temp = app.open(file);
  temp.activeLayer.name = layerName;
  temp.selection.selectAll();
  temp.selection.copy();
  temp.close(SaveOptions.DONOTSAVECHANGES);
  app.activeDocument.paste();
  app.activeDocument.activeLayer.name = layerName;
}

var parts = JSON.parse(readText(manifestFile));
var doc = app.documents.add(1024, 1536, 350, "hoshiyume_luna_live2d_parts", NewDocumentMode.RGB, DocumentFill.TRANSPARENT);

for (var i = 0; i < parts.length; i++) {
  var part = parts[i];
  var png = File(sourceFolder.fsName + "/" + part.name + ".png");
  if (png.exists) {
    placePngAsLayer(png, part.name);
  }
}

alert("Imported " + parts.length + " Live2D part layers. Save this document as PSD.");
