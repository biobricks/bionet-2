
The primary bionet database is a leveldb instance which is then split up into several logical databases using ranged queries (sublevels). The following sublevels exist:

* userDB: user accounts
* bioDB: biological and inventory information
* indexDB: various indexes to speed up queries
* miscDB: e.g. the counter for the human-readable ID generator

TODO the following is not yet complete:

The bionet then uses ElasticSearch as a search engine and an NCBI BLAST+ database to facilitate types of queries not supported by leveldb.

Both the ElasticSearch and BLAST databases can be thought of as indexes as they are automatically updated when changes occur on bioDB and never written to directly.

# bioDB

Minimal structure for bioDB entries:

```
{
  key: <class_abbrev>-<uuid>
  value: {
    id: <class_abbrev>-<uuid>,
    created: {
      at: <seconds since epoch>,
      by: <user_id>
    },
    updated: {
      at: <seconds since epoch>,
      by: <user_id>
    }
  }
}
```

## class: virtual

Class abbreviation is: v

```
{
  key: v-<uuid>
  value: {
    id: v-<uuid>,
    type: <type>,
    name: <text>,
    description: <text>,
    canHavePhysicals: <boolean>, // can physical instances of this exist?
    files: [
      fileName: <generated_unique_name_on_disk>,
      fileType: <detected_file_type>,
      name: <name_of_uploaded_file>
    ],
    // ... + any type-specific fields
    // ... + fields required for all bioDB entries
  }
}
```

## class: physical

Class abbreviation is: p

```
{
  key: p-<uuid>
  value: {
    id: p-<uuid>,
    type: <type>,
    virtual_id: <uuid>, // the id of the parent virtual (if any)
    name: <text>,
    description: <text>,
    barcode: <barcode>, // barcode as string (If any. Only for DataMatrix)
    parent_id: <physical_id>,
    files: [
      fileName: <generated_unique_name_on_disk>,
      fileType: <detected_file_type>,
      name: <name_of_uploaded_file>
    ],
    // ... + any type-specific fields, e.g:
    locationInParent: { 
      // e.g. "shelf 2, rack 3, row 3, column 4" if needed for this type
    }
    // ... + fields required for all bioDB entries
  }
}
```

## types

Different types will have different type-specific fields. These fields are currently specified in settings.js. We are planning to make it possible for users to create their own types. If a type has `virtual: true` set then any physicals of that type must be an instance of a virtual.

Example:

```
dataTypes: [
  {
    name: "-80 freezer",
    fields: {
      shelf: 'text',
      rack: 'text',
      box: 'text'
    }
  },{
    name: "room",
    fields: {
      name: 'text'
    }
  },{
    name: "plasmid",
    virtual: true,
  },{
    name: "organism",
    virtual: true
  }
]
```

# leveldb indexes

These are indexes that are kept by leveldb in the indexDB sublevel.

## physical hierarchy

Makes it possible to quickly look up hierarchy info.

```
{
    key: '<grandparent_physical_id>.<parent_physical_id>',
    value: '<physical_id>'
}
```

Any change in a physical's `parent_id` must cause this index to automatically update.

# ElasticSearch index

Makes it possible to do plain text and keyword searches with spelling correction suggestions etc. 

TODO finish implementing

* https://github.com/dominictarr/level-livefeed

Relevant links:

* https://github.com/topdmc/ElasticsearchStreamIndex
* https://github.com/topdmc/level-stream-to-elasticsearch

# BLAST index

TODO finish implementing

Relevant links:

* https://github.com/biobricks/blast-level

Change it to using the level-livefeed method?


  