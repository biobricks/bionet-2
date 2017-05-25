
var async = require('async');
var sublevel = require('subleveldown');
var treeIndex = require('level-tree-index');
var ElasticIndex = require('level-elasticsearch-index');

module.exports = function(settings, db) {

  var inventoryTree = treeIndex(db.physical, sublevel(db.index, 't'), {
    parentProp: 'parent_id'
  });

  var elasticIndex = ElasticIndex(db.bio, {});

  elasticIndex.add('name', function(key, val) {
    val = JSON.parse(val); // TODO this should not be needed

    var o = {
      id: val.id,
      name: val.name
    };

    return o;
  });

  elasticIndex.ping(function(err) {
    if(err) return console.error("Warning: Could not connect to ElasticSearch server. Proceeding without ElasticSearch indexing.\n", err);
    elasticIndex.rebuildAll(function(err) {
      if(err) return console.error("elastic index rebuild error:", err);
      console.log("Finished elastic index rebuild");
    });
  })

  function rebuild() {
    // TODO rebuild elasticSearch index as well

    inventoryTree.rebuild(function(err) {
      if(err) return console.error("inventory tree rebuild error:", err);
      console.log("Finished inventory tree rebuild");
    });
  }

  return {
    inventoryTree: inventoryTree,
    elastic: elasticIndex,
    rebuild: rebuild
  };

}


