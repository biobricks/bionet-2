

var physicalTree = treeIndex(db.physical, sublevel(indexDB, 't'), {
  parentProp: 'parent_id'
});

var elasticIndex = ElasticIndex(bioDB, {});

elasticIndex.add('name', function(key, val) {
  val = JSON.parse(val); // TODO this should not be needed

  var o = {
    id: val.id,
    name: val.name
  };

  return o;
});

// TODO for debug only
physicalTree.rebuild(function(err) {
  if(err) return console.error("inventory tree rebuild error:", err);
  console.log("Finished inventory tree rebuild");
});

elasticIndex.ping(function(err) {
  if(err) return console.error("Warning: Could not connect to ElasticSearch server. Proceeding without ElasticSearch indexing.\n", err);
  elasticIndex.rebuildAll(function(err) {
    if(err) return console.error("elastic index rebuild error:", err);
    console.log("Finished elastic index rebuild");
  });
})
