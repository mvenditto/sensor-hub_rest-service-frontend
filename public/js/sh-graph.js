var node_interactions = { }

let SH_REST_SERVER = 'http://localhost:8081/'

let DRIVERS = 'drivers'
let DEVICES = 'devices'
let DATASTREAMS = 'dataStreams'
let SERVICES = 'services'
let PROPERTIES = 'observedProperties'
let TASKS = DEVICES + '/tasks'

let HUBS_GROUP = 'hubs'
let THINGS_GROUP = 'things'
let DEVICES_GROUP = 'sensors'
let DRIVERS_GROUP = 'drivers'
let PROPERTIES_GROUP = 'properties'
let SERVICES_GROUP = 'services'
let DATASTREAMS_GROUP = 'datastreams'
let TASKS_GROUP = 'tasks'

function shGet(resourceName) {return $.get(SH_REST_SERVER + resourceName) }

function shBuildSystemGraph() {

  showLoadingModal()

  var ids = 2
  var nodes = new Set()
  var edges = new Set()

  let sh = {id: 0, label: "sh-hub-0", group: 'hubs',/*, shape:'image', image:'imgs/tag.svg',*/ level:1}
  let root = {id: 1, label: "fireman-0", group: 'things', level:2}

  nodes.add(sh);
  nodes.add(root);
  edges.add({from:sh.id, to:root.id})

  function findDriverId(name) {
    var driverId = undefined
    nodes.forEach(n => {
      if (n.group == DRIVERS_GROUP && n.data.name == name) {
        driverId = n.id
      }
    })
    return driverId
  }

  function findPropId(def) {
    var propId = undefined
    nodes.forEach(n => {
      if (n.group == PROPERTIES_GROUP && n.data.definition == def) {
        propId = n.id
      }
    })
    return propId
  }

  function findDeviceId(id) {
    var devId = undefined
    nodes.forEach(n => {
      if (n.group == DEVICES_GROUP && n.data.id == id) {
        devId = n.id
      }
    })
    return devId
  }

  Promise.all([
    shGet(SERVICES),
    shGet(DRIVERS),
    shGet(DEVICES),
    shGet(PROPERTIES),
    shGet(DATASTREAMS),
    shGet(TASKS)]
  ).then(results => {

    let services = JSON.parse(results[0])
    let drivers = JSON.parse(results[1])
    let devices = JSON.parse(results[2])
    let properties = JSON.parse(results[3])
    let dataStreams = JSON.parse(results[4])
    let tasks = JSON.parse(results[5])

    services.forEach(s => {
      nodes.add({id: ids, label:s.name, group:SERVICES_GROUP, data:s, level:0})
      ids = ids + 1
      edges.add({from: sh.id, to: ids - 1})
    })

    drivers.forEach(drv => {
      nodes.add({id: ids, label:drv.name, group:DRIVERS_GROUP, data:drv, level: 3})
      edges.add({from: sh.id, to: ids})
      ids = ids + 1
    })

    devices.forEach(dev => {
      nodes.add({id: ids, label:dev.name, group:DEVICES_GROUP, data:dev, level: 4})
      edges.add({from:root.id, to:ids})
      edges.add({from: ids, to: findDriverId(dev.driverName), dashes: true})
      ids = ids + 1
      let devId = ids - 1
      let devTasks = tasks.find(t => t.deviceId == dev.id)
      if (devTasks != undefined) {
        devTasks.supportedTasks.forEach(t => {
          t.deviceId = dev.id
          nodes.add({id: ids, label:t.title, group:TASKS_GROUP, data:t, level:5})
          edges.add({from:devId, to:ids})
          ids = ids + 1
        })
      }
    })

    properties.forEach(prop => {
      nodes.add({id:ids, label:prop.name, group:PROPERTIES_GROUP, level:6, data:prop})
      ids = ids + 1
    })

    dataStreams.forEach(ds => {
      nodes.add({id:ids, label:ds.name, group:DATASTREAMS_GROUP, data:ds, level:5})
      edges.add({from:findDeviceId(ds.sensor.id), to: ids})
      edges.add({from:ids, to:findPropId(ds.observedProperty.definition)})
      ids = ids + 1
    })

    var container = document.getElementById('mynetwork');
    var data = {
        nodes: Array.from(nodes),
        edges: Array.from(edges)
    };
    var network = new vis.Network(container, data, options);
    shInitGraphEvents(network);
    $("#mynetwork canvas").bind("contextmenu", (e) => false);
    $(document).ready(d => network.redraw())
    hideLoadingModal()
  })
}

function shInitGraphEvents(network) {

  let nodes = network.body.data.nodes;

  network.on("hoverNode", function (params) {
      node_interactions["hovered"] = nodes._data[params.node];
  });

  network.on("oncontext", function (params) {
    console.log(node_interactions["hovered"])
  });

  network.on("click", function (params) {
      let node = params.nodes[0]
      if (node != undefined) {
        node_interactions["selected"] = nodes._data[node];
        let c = document.getElementById("netexplorer")
        while (c.firstChild) {
          c.removeChild(c.firstChild);
        }
        let n = nodes._data[node]
        c.appendChild(jsonToOnsCard(n.data, n.group));

        if (n.group === DRIVERS_GROUP) {
          c.appendChild(deviceCreationForm);
        }

        if (n.group === DATASTREAMS_GROUP) {
          c.appendChild(datastreamWS);
        }

        if(n.group == TASKS_GROUP){
          c.appendChild(taskDebug)
          let task = node_interactions["selected"].data
          let schema = {}
          task.required.forEach(field => schema[field] = task.properties[field].type)
          $("#task-msg-area").val(JSON.stringify(schema, null, 4))
        }

      }
  });

}

var options = {
    interaction: {hover: true},
    layout: {
      hierarchical: {
        //sortMethod: "directed"
        direction: "DU"
      }
    },
    nodes: {
        shape: 'dot',
        size: 20,
        font: {
            size: 15,
            color: '#121212'
        },
        borderWidth: 2
    },
    edges: {
        width: 1,
        smooth: true,
        color: {color: "#4286f4"},
        arrows: "to"
    },
    groups: {
        sensors: {
            shape: 'icon',
            icon: {
                face: 'FontAwesome',
                code: '\uf2db',
                size: 50,
                color: '#FB9537'
            }
        },
        drivers: {
            shape: 'icon',
            icon: {
                face: 'FontAwesome',
                code: '\uf085',
                size: 50,
                color: '#707070'
            }
        },
        datastreams: {
            shape: 'icon',
            icon: {
                face: 'Ionicons',
                code: '\uf492',
                size: 50,
                color: '#484749'
            }
        },
        tasks: {
            shape: 'image',
            image: 'imgs/task.svg'
        },
        properties: {
            shape: 'icon',
            icon: {
                face: 'FontAwesome',
                code: '\uf288',
                size: 50,
                color: '#BF1A2F'
            }
        },
        hubs: {
            shape: 'icon',
            icon: {
                face: 'FontAwesome',
                code: '\uf233',
                size: 50,
                color: '#4286f4'
            }
        },
        things: {
            shape: 'icon',
            icon: {
                face: 'Ionicons',
                code: '\uf2ac',
                size: 50,
                color: '#138A36'
            }
        },
        services: {
            shape: 'icon',
            icon: {
                face: 'FontAwesome',
                code: '\uf1b2',
                size: 50,
                color: '#9E788F'
            }
        }
    }
};

function deleteDevice() {
    let selectedNode = node_interactions["selected"]
    if (selectedNode != undefined && selectedNode.group == "sensors") {
      $.ajax({
        url: "http://localhost:8081/devices/" + selectedNode.data.id,
        type: 'DELETE',
        success: function(result) {
          console.log(result);
          shBuildSystemGraph();
          ons.notification.toast('successfully deleted device!', {timeout: 5000, animation: 'fall', modifier:'success' })
        },
        failure: function(result) {
          ons.notification.toast('failed to deleted device!', {timeout: 5000, animation: 'fall', modifier:'failure' })
        }
      });
    }
}

function createDeviceFromDriver() {
  let selectedNode = node_interactions["selected"]
  if (selectedNode != undefined) {
    let deviceMetadata =
    {
        name: $("#devName")[0].value,
        description: $("#devDesc")[0].value,
        metadataEncoding: $("#devMetadataEncoding")[0].value,
        metadata: $("#devMetadataURI")[0].value,
        driverName: selectedNode.data.name,
    }
    let devCfg = $("#devCfg").val()
    if (devCfg != " ") {
      deviceMetadata["cfgString"] = devCfg
    }
    console.log(JSON.stringify(deviceMetadata))
    showLoadingModal();
    $.post("http://localhost:8081/devices/", JSON.stringify(deviceMetadata), (data) => {
      console.log(data)
      hideLoadingModal();
      if (data != undefined) {
        console.log("refresh");
        ons.notification.toast('successfully created: ' + JSON.stringify(data), {timeout: 5000, animation: 'fall', modifier:'success' })
        shBuildSystemGraph();
      } else {
        ons.notification.toast('failed to create resource: ' + JSON.stringify(data), {timeout: 5000, animation: 'fall', modifier:'failure' })
      }
    }, "json")
  }
}
