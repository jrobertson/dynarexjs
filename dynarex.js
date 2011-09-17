// file: dynarex.js

function loadXMLDoc(url) {

  if (window.XMLHttpRequest)
    xhttp=new XMLHttpRequest();
  else
    xhttp=new ActiveXObject("Microsoft.XMLHTTP");

  xhttp.open("GET",url,false);
  xhttp.send("");
  return xhttp.responseXML;
}

function fetchDynarex(file) {

  xml=loadXMLDoc(file);

  var dynarex = new Object();

  dynarex.summary = [];
  summary = xml.firstChild.childNodes[0];

  for (j = 0; j < summary.childNodes.length; j++){
    x = summary.childNodes[j];
    dynarex.summary[x.nodeName] = x.firstChild.nodeValue;
  }
  
  dynarex.records = [];
  records = xml.firstChild.childNodes[1];

  for (k = 0; k < records.childNodes.length; k++){
    rec = records.childNodes[k];
    var record = [];

    for (var i = 0; i < rec.childNodes.length; i++) {
      var field = rec.childNodes[i];
      record[field.nodeName] = field.firstChild.nodeValue;
    }
    dynarex.records[k] = record;  
  }

  return dynarex;
}
