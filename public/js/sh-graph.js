var node_interactions = { }

let SH_REST_SERVER = 'http://localhost:8081/'

let DRIVERS = 'drivers'
let DEVICES = 'devices'
let DATASTREAMS = 'dataStreams'
let SERVICES = 'services'
let PROPERTIES = 'observedProperties'
let TASKS = DEVICES + '/tasks'
let FOVS = 'featuresOfInterest'

let HUBS_GROUP = 'hubs'
let THINGS_GROUP = 'things'
let DEVICES_GROUP = 'sensors'
let COLLAPSED_DEVICE = 'collapsed_sensors'
let DRIVERS_GROUP = 'drivers'
let PROPERTIES_GROUP = 'properties'
let SERVICES_GROUP = 'services'
let DATASTREAMS_GROUP = 'datastreams'
let TASKS_GROUP = 'tasks'
let FOVS_GROUP = 'features_of_interest'

var data = {}
var data2 = {}
var network = undefined
var clusters = []

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

  function findFeatureId(name) {
    var fovId = undefined
    nodes.forEach(n => {
      if (n.group == FOVS_GROUP && n.data.name == name) {
        fovId = n.id
      }
    })
    return fovId
  }

  Promise.all([
    shGet(SERVICES),
    shGet(DRIVERS),
    shGet(DEVICES),
    shGet(PROPERTIES),
    shGet(DATASTREAMS),
    shGet(TASKS),
    shGet(FOVS)]
  ).then(results => {

    let services = JSON.parse(results[0])
    let drivers = JSON.parse(results[1])
    let devices = JSON.parse(results[2])
    let properties = JSON.parse(results[3])
    let dataStreams = JSON.parse(results[4])
    let tasks = JSON.parse(results[5])
    let features = JSON.parse(results[6])

    services.forEach(s => {
      nodes.add({id: ids, label:s.name, group:SERVICES_GROUP, data:s, level:0})
      ids = ids + 1
      edges.add({from: sh.id, to: ids - 1})
    })

    drivers.forEach(drv => {
      nodes.add({id: ids, label:drv.name, group:DRIVERS_GROUP, data:drv, level: 2})//3
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
          nodes.add({id: ids, label:t.title, group:TASKS_GROUP, data:t, level:5, widthConstraint: {maximum: 200}})
          edges.add({from:devId, to:ids})
          ids = ids + 1
        })
      }
    })

    properties.forEach(prop => {
      nodes.add({id:ids, label:prop.name, group:PROPERTIES_GROUP, level:7, data:prop})//6
      ids = ids + 1
    })

    features.forEach(fov => {
      nodes.add({id:ids, label:fov.name, group:FOVS_GROUP, level:8, data:fov})//6
      ids = ids + 1
    })

    dataStreams.forEach(ds => {
      nodes.add({id:ids, label:ds.name, group:DATASTREAMS_GROUP, data:ds, level:6})//5
      edges.add({from:findDeviceId(ds.sensor.id), to: ids})
      let propId = findPropId(ds.observedProperty.definition)
      edges.add({from:ids, to:propId})
      edges.add({from:ids, to:findFeatureId(ds.featureOfInterest.name)})
      ids = ids + 1
    })

    var container = document.getElementById('mynetwork');
    nodes = Array.from(nodes)
    data = {
        nodes: new vis.DataSet(nodes),
        edges: new vis.DataSet(Array.from(edges))
    };
    data2 = {
        nodes: nodes.slice(),
        edges: data.edges
    }
    network = new vis.Network(container, data, options);
    shInitGraphEvents(network);
    $("#mynetwork canvas").bind("contextmenu", (e) => false);
    $(document).ready(d => network.redraw())
    $("#mynetwork").prepend(graphMenu)
    hideLoadingModal()
    $(".splitter_panel").css({"overflow": "hidden"})
    clusterTasks()
    globalView()
  })
}

function isChild(parent, child) {
  var r = false
  data.edges.forEach(e => {
    if (e.from === parent.id && e.to === child.id) {
      r = true
    }
  })
  return r
}



function openClusters() {
  clusters.forEach(n => network.openCluster(n))
}

function shInitGraphEvents(network) {

  let nodes = network.body.data.nodes;

  network.on("hoverNode", function (params) {
      node_interactions["hovered"] = nodes._data[params.node];
  });

  network.on("oncontext", function (params) {
  });

  network.on("selectNode", function(params) {
        if (params.nodes.length == 1) {
            if (network.isCluster(params.nodes[0]) == true) {
                network.openCluster(params.nodes[0]);
            }
        }
  });

  network.on("doubleclick", (p) => console.log(p));

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
          let ds = node_interactions["selected"].data
          let ot = ds.observationType.split('/')
          if(ot[ot.length - 1] === "OM_Measurement") {
            c.appendChild(datastreamChart)
            let chart_container = $("#ds_chart")[0]
            while(chart_container.firstChild) {
              chart_container.removeChild(chart_container.firstChild)
            }
            let ds_id = ds.sensor.id + "_" + ds.name
            chart_container.appendChild(createChart(ds_id))
            c.appendChild(datastreamWS);
          }
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

function clusterTasks() {
      clusters = []
      var devs = data.nodes.get({
        filter: function(n) {
          return n.group === DEVICES_GROUP
        }
      })

      devs.forEach(dev => {
        var neighbors = network.getConnectedNodes(dev.id)
        var clusterOptionsByData = {
            joinCondition: function(childOptions) {
                return childOptions.group === TASKS_GROUP && neighbors.includes(childOptions.id);
            },
            processProperties: function (clusterOptions, childNodes, childEdges) {
              clusterOptions.label = "tasks("+childNodes.length+")[+]"
              clusters.push(clusterOptions.id)
              return clusterOptions
            },
            clusterNodeProperties: {label: "tasks[+]", id:'tasks-cluster_' +  dev.id, group: TASKS_GROUP, level: 5}
        };
        network.cluster(clusterOptionsByData);
      })
}

var options = {
    interaction: {hover: false},
    layout: {
      improvedLayout: false,
      hierarchical: {
        direction: "DU",
        sortMethod: "directed",
        nodeSpacing: 100,
        //treeSpacing: 435,
        levelSeparation: 100,
        //blockShifting: false,
        //edgeMinimization: true,
        //parentCentralization: true
      },
      randomSeed: 8
    },
    physics: {
      enabled: false
    },
    nodes: {
        shape: 'dot',
        size: 20,
        font: {
            size: 15,
            color: '#121212'
        },
        borderWidth: 2,
        font: {
          size: 24
        }
    },
    edges: {
        width: 1.5,
        smooth: true,
        color: {
          highlight: "#4286f4",
          hover: "#6891d8",
          color: "#8c9199",
        },
        arrows: "to"
    },
    groups: {
        sensors: {
          shape: 'image',
          image : 'imgs/sensor.png',
          size: 30
        },
        collapsed_sensors: {
            shape: 'image',
            image: 'imgs/collapsed_sensor.png',
            size: 30
        },
        drivers: {
          shape: 'image',
          image : 'imgs/gearwheels-couple.svg',
          size: 30
        },
        datastreams: {
          shape: 'image',
          image : 'imgs/pulse.svg',
          size: 35
        },
        tasks: {
            shape: 'image',
            image: 'imgs/cogwheel-arrow.svg',
            size: 25,
            font: {
              size: 18
            }
        },
        properties: {
          shape: 'image',
          image : 'imgs/hub.png',
          size: 27
        },
        features_of_interest: {
          shape: 'image',
          image : 'imgs/magnifier-with-an-eye.png',
          size: 30
        },
        hubs: {
          shape: 'image',
          image : 'imgs/server.svg',
          size: 20
        },
        things: {
          shape: 'image',
          image : 'imgs/wireless-internet.png',
          size: 30
        },
        services: {
        shape: 'image',
        image : 'imgs/puzzle-piece.svg',
        size: 25
        }
    }
};

var options2 = {
    interaction: {dragNodes: true, hover:true},
    layout: {
      hierarchical: {
        direction: "UD",
        sortMethod: "directed",
        nodeSpacing: 1300,
        treeSpacing: 435,
        levelSeparation: 500,
        blockShifting: false,
        edgeMinimization: false,
        parentCentralization: true
      },
    },
    physics: {
      enabled: false
    },
    nodes: {
        shape: 'box',
        chosen: {
          node: function(values, id, selected, hovering) {
                  if(selected === true) {
                    values.borderColor = "yellow"
                    values.borderWidth = 1.0
                    values.color = "#F8EFBA"
                    values.shadowSize = 70
                    values.shadowColor = "yellow"
                    values.shadowX = -1
                    values.shadowY = -1
                  }
                },
          label: function(values, id, selected, hovering) {
                  if(selected === true) {
                    values.color = "#2C3A47"
                    values.mod = "bold"
                    values.size = 300
                  }
                }
        }
    },
    edges: {
        width: 20,
        smooth: false,
        color: {
          highlight: "#4286f4",
          hover: "#6891d8",
          color: "#8c9199",
        },
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 5.0
          }
        }
    },
    groups: {
        sensors: {
          size: 200,
          margin: { top: 35, right: 35, bottom: 35, left: 35 },
          borderWidth: 0.5,
          font: {
            size: 200,
            color: "black"
          },
          color: {
              background: "#f67b0e",
              border: "black"
          }
        },
        drivers: {
          margin: { top: 35, right: 35, bottom: 35, left: 35 },
          borderWidth: 0.5,
          font: {
            size: 150,
            color: "black",
            strokeWidth: 5,
            strokeColor: "white"
          },
          color: {
              background: "lightgray",
              border: "black"
          }
        },
        datastreams: {
          margin: { top: 35, right: 35, bottom: 35, left: 35 },
          borderWidth: 0.5,
          font: {
            size: 170,
            color: "white",
          },
          color: {
              background: "#485460",
              border: "black"
          }
        },
        tasks: {
          shape: "box",
          color: "gray",
          hidden: true
        },
        properties: {
          margin: { top: 35, right: 35, bottom: 35, left: 35 },
          borderWidth: 0.5,
          font: {
            size: 160,
            color: "black"
          },
          color: {
              background: "#FD7272",
              border: "black"
          }
        },
        features_of_interest: {
          margin: { top: 35, right: 35, bottom: 35, left: 35 },
          borderWidth: 0.5,
          font: {
            size: 160,
            color: "white"
          },
          color: {
              background: "#98214f",
              border: "black"
          }
        },
        hubs: {
          margin: { top: 35, right: 35, bottom: 35, left: 35 },
          borderWidth: 0.5,
          font: {
            size: 160,
            color: "white",
            strokeWidth: 5,
            strokeColor: "black"
          },
          color: {
              background: "#3c40c6",
              border: "black"
          }
        },
        things: {
          margin: { top: 35, right: 35, bottom: 35, left: 35 },
          borderWidth: 0.5,
          font: {
            size: 150,
            color: "black",
            strokeWidth: 5,
            strokeColor: "white"
          },
          color: {
              background: "#0be881",
              border: "black"
          }
        },
        services: {
          margin: { top: 35, right: 35, bottom: 35, left: 35 },
          borderWidth: 0.5,
          font: {
            size: 150,
            color: "black",
            strokeWidth: 5,
            strokeColor: "white"
          },
          color: {
              background: "#D6A2E8",
              border: "black"
          }
        }
    }
};

function globalView() {

  var container = document.getElementById('globalview');


  var network2 = new vis.Network(container, data2, options2);

  function getContent(id) {
    let dataz = data.nodes.get()[id].data
    if (dataz == undefined || dataz.description.length <= 0) {
      return "no description\navailable!"
    } else {
      return dataz.description
    }
  }

  network2.on("hoverNode", function(params) {
    let content = getContent(params.node)
    $('#globalview').qtip({
      content: content,
        style: {
          classes: 'qtip-dark'
        },
        show: {
          event: event.type
        },
        position: {
          my: 'top left',
          target: 'mouse',
          adjust: {
            x: 10, y: 10
          }
        }
      });
    });

  network2.on("blurNode", function(params) {
    $('#globalview').qtip({
      content: 'Node with ID: ' + params.node,
      hide: true
    });
  })

  network2.on("selectNode", function(params) {

    if (params.nodes[0] === 0) {
      data.nodes.get({filter: (n) => data.nodes.update({id: n.id, hidden: false})})
      return;
    }

    var connected = network.getConnectedNodes(params.nodes[0])

    for (var ds in connected) {
      var dss = connected[ds]
      if (network.body.nodes[dss].options.group === DATASTREAMS_GROUP) {
        var fov_prop = network.getConnectedNodes(dss)
        fov_prop.forEach(fp => {
          if (fp != params.nodes[0]) {
            connected.push(fp)
          }
        })
      }
    }

    clusters.forEach(c =>  {
      network.clustering.updateClusteredNode(c, {hidden: !connected.includes(c)})
    });

    var items = data.nodes.get();
    var toHide = []

    items.forEach(n => {
      var hide = false
      if (!connected.includes(n.id) && n.id != params.nodes[0]) {
        hide = true
      }
      toHide.push({id: n.id, hidden: hide})
    })
    data.nodes.update(toHide)
    network.focus(params.nodes[0], {animation: true, scale: 0.5})
  });
}

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
    if (devCfg.length > 0) {
      deviceMetadata["cfgString"] = devCfg
    }
    let propCfg = $("#propCfg").val()
    if (propCfg.length > 0) {
      deviceMetadata["dsProps"] = JSON.parse(propCfg)
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
