// file: dynarex.js

// requires jaxle.js, and jfr.js

function Dynarex(file) {

  xml = new Jaxle(file).root;

  var dynarex = new Object();

  dynarex.summary = [];
  summary = xml.firstChild.childNodes[0];

  // fetch the dynarex summary
  summary.elements().each(function(item){
    dynarex.summary[item.nodeName] = item.text;
  });
  
  dynarex.records = new rb.Array();
  records = xml.firstChild.childNodes[1];

  // fetch the dynarex records
  records.elements().each(function(rec){

    var record = [];

    rec.elements().each(function(field){
      record[field.nodeName] = field.text();
    });
    //dynarex.records[k] = record;
    dynarex.records.push(record);    
  });

  // return the dynarex object
  return dynarex;
}


// -- start of dynarex data islands --------

function findHTMLRecordToClone(element) {

  parent = element.parentNode;
  parentName = new rb.String(parent.nodeName).downcase();

  switch (parentName) {
    case 'body' : 
      return null; 
      break;
    case 'tr' : 
      return parent; 
      break;
    default :
      return findHTMLRecordToClone(parent);
  }
}

function dataIslandRender(file, node) {

  dynarex = Dynarex(file);
  recOriginal = findHTMLRecordToClone(node);
  
  if (recOriginal) {

    // get a reference to each element containing the datafld attribute
    var destNodes = [];
    
    dynarex.records.each(function(record){
    
      rec = recOriginal.cloneNode(true);

      rec.xpath('//span[@datafld]').each(function(span){
        destNodes[span.attribute('datafld').downcase()] = span;
      });

      for (field in destNodes){
        if (record[field] == null) continue;
        destNodes[field].innerHTML = record[field];
      }    

      recOriginal.parentNode.appendChild(rec);
    });

    recOriginal.parentNode.removeChild(recOriginal);
  }

}

function dataIslandInit(){
  document.xpath("//object[@type='text/xml']").each( function(x){
    xpath = "//*[@datasrc='#" + x.attribute('id').to_s() + "']"
    document.xpath(xpath).each(function(island){
      node = island.element('//span[@datafld]');
      dataIslandRender(x.attribute('data').to_s(), node);
    });
  });
}

dynarexDataIsland = {init: dataIslandInit}
//dynarexDataIsland.init();
//-- end of dynarex data islands