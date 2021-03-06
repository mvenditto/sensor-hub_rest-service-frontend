var select_ds = undefined

function addDsGraph() {
  if (select_ds != undefined) {
    lineGraphCard("dash", select_ds)
  }
}

function editSelects(event) {
  select_ds = event.target.value
  console.log(event.target.value)
  document.getElementById('choose-sel').removeAttribute('modifier');
  if (event.target.value == 'material' || event.target.value == 'underbar') {
    document.getElementById('choose-sel').setAttribute('modifier', event.target.value);
  }
}
function addOption(name) {
  let option = document.createElement('option');
  option.innerText = name;
  $('#choose-sel select')[0].appendChild(option);
}


function obsDatastream() {
  let ds = node_interactions["selected"]
  if (ds != undefined && ds.group == DATASTREAMS_GROUP) {
    let dsId = ds.data.sensor.id + "_" + ds.data.name;
    let obsField = $("#ds-obs")[0]
    $.get('http://localhost:8081/dataStreams/' + dsId, (data, status) => {
      while(obsField.firstChild) {
        obsField.removeChild(obsField.firstChild)
      }
      obsField.appendChild(renderjson(JSON.parse(data)))
    })
  }
}

function pollTaskResult(url, timeout){
    $.get(url, function(data) {
        if (data != undefined && url != undefined) {
          console.log("data 1 ", data)
          let json = JSON.parse(data)
          console.log("data 2 " + url + " " + json)
          if (json.status == "ready") {
            console.log("task", json.result)
            ons.notification.toast("task: " + url + ' complete with result: ' + JSON.stringify(json.result),
              {timeout: 5000, animation: 'fall', modifier:'success' })
          } else {
            setTimeout(pollTaskResult(url, timeout), timeout);
          }
        } else {
          setTimeout(pollTaskResult(url, timeout), timeout);
        }
    });
}

function sendTask() {
  let ds = node_interactions["selected"]
  if (ds != undefined && ds.group == TASKS_GROUP) {
    let taskName = ds.data.title
    let deviceId = ds.data.deviceId
    let message = $("#task-msg-area")[0].value

    $.ajax({
      url: "http://localhost:8081/devices/" + deviceId + "/tasks/" + taskName,
      type: 'PUT',
      contentType: "application/json",
      data: message,
      success: function(data, status, request) {
        let taskUrl = request.getResponseHeader("Location")
        $("#task-result")[0].setAttribute("href", taskUrl)
        $("#task-result").text(taskUrl)
        ons.notification.toast(taskName + ' crated @: ' + taskUrl,
          {timeout: 3000, animation: 'fall', modifier:'success' })
        pollTaskResult(taskUrl, 5000)
      },
      failure: function(data, status, error) {
          ons.notification.toast(error,
            {timeout: 3000, animation: 'fall', modifier:'failure' })
      }
    });
  }
}

function showLoadingModal() {
  document.getElementById("loading-modal").show()
}
function hideLoadingModal() {
  document.getElementById("loading-modal").hide()
}

function jsonToOnsCard(j, title="") {

  var cardTitle = "Object?"
  switch (title) {
    case "properties":
      cardTitle = "ObservedProperty"
      break;
    case "sensors":
      cardTitle = "Device"
      break;
    case "datastreams":
      cardTitle = "DataStream"
      break;
    case "drivers":
      cardTitle = "DeviceDriver"
      break;
    case "services":
      cardTitle = "Service"
      break;
    case "units":
      cardTitle = "UnitOfMeasurement"
      break
    case "tasks":
      cardTitle = "Task"
      break
    default:
  }

  let card = document.createElement("ons-card")
  card.setAttribute("style", "")

  card.innerHTML =
     `<div class="title" style="border-bottom: 1px solid #CAD3C8;">${cardTitle}</div>
     <div id="content" class="content"></div>`

  let content = card.querySelector("#content")

  Object.keys(j).forEach(key => {
      while(content.firstChild) {
        content.removeChild(content.firstChild)
      }
      content.appendChild(renderjson(j))
      if (cardTitle == "Device") {
        let deleteBtn = document.createElement("div")

        deleteBtn.innerHTML = `<p style="margin-top: 30px;"><ons-button onclick="showTemplateDialog('my-dialog','dialog.html');">Delete</ons-button></p>`
        content.appendChild(deleteBtn)
      }
  });

  return card
}

var items = { }

function removeItem(id) {
  let item = items[id]
  if (item != undefined) {
    console.log("deleteing")
    grid1.remove(item,{removeElements: true})
    delete items[id]
  }
}

function createAllItems() {
  let opts = $("option")
  var i
  for(i=0; i<opts.length;i++){
      createItem(opts[i].value)
  }
}

function makeItemsResizable() {
  interact('.item')
  /*.draggable({
    onmove: window.dragMoveListener,
    restrict: {
      restriction: 'parent',
      elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
    },
  })*/
  .resizable({
    edges: { left: false, right: true, bottom: true, top: false },
    restrictEdges: {
      outer: 'parent',
      endOnly: true,
    },
    restrictSize: {
      min: { width: 100, height: 100 },
    },
    inertia: false,
  })
  .on('resizemove', function (event) {
    let rect = interact.getElementRect(event.target.querySelector(".item-content"))
    let target = event.target;
    //let r = event.target.getBoundingClientRect();
    //console.log(r.x, r.y, event.rect)
    console.log(event.rect.width, event.rect.height, rect.width, rect.height)
    target.style.width = (event.rect.width) +"px";
    target.style.height = (event.rect.height) + "px";
    grid1.refreshItems(target).layout()
  })
  .on('resizeend', function (event) {
    grid1.refreshItems().layout()
  });
}

function createItem(ds) {

  let item = document.createElement("div")
  item.classList.add("item")

  let datastream = ds

  let id = datastream + new Date().getTime()

  item.setAttribute("id", id)

  item.innerHTML =
  `<div class="item-content">
    <div class="item-item">
      <p>paceholder</p>
      <canvas></canvas>
    </div>
  </div>`

  var chart = new SmoothieChart({millisPerPixel: 49,
    maxValueScale: 1.1,
    minValueScale: 1.1,
    responsive: true,
    grid: {
      fillStyle:'#eaeaea',
      strokeStyle:'rgba(119,119,119,0.19)',verticalSections:4},
      labels:{fillStyle:'#9200a5'},
      tooltip:true,
      timestampFormatter:SmoothieChart.timeFormatter
    }),
  canvas = item.querySelector("canvas"),
  series = new TimeSeries();

  chart.addTimeSeries(series, {lineWidth:1.5,strokeStyle:'#4d8df5'});
  chart.streamTo(canvas, 1000);

  let ws = new WebSocket("ws://localhost:8081/" + datastream);
  ws.onmessage = function(event) {
    let json = JSON.parse(event.data)
    if (json != undefined) {
      series.append(new Date().getTime(), json);
    }
  }

  grid1.add(item)
  //grid1.refreshItems(item).layout()
  items[id] = item
  return item

}

function dsSelect() {

  let ds = data.nodes.get({filter: (d) => {
    return d.group === DRIVERS_GROUP && d.id === node_interactions["selected"].id
  }});

  console.log(ds)
  let meta = ds[0].data.datastreamsMetadata

  let select = $("#cp_dss select")
  select.empty()

  for(var d in meta) {
    select.append("<option>"+ d +"</option>")
  }

}

function showPropsDialog() {
  dsSelect()
  showTemplateDialog('my-dialog2','dialog2.html')
}

function customProps() {
  let name = $("#cp_name")
  let desc = $("#cp_desc")
  let fov_name = $("#cp_fov_name")
  let fov_desc = $("#cp_fov_desc")
  let fov_enc = $("#cp_fov_enc")
  let fov_feat = $("#cp_fov_feat")

  var props = { }
  var feat = { }

  function setIfNonEmpty(input, field) {
    let disabled = input.is(":disabled")
    let value = input.val()
    if(!disabled && value.length > 0) feat[field] = value
    disabled
  }

  if (!name.is(":disabled") && name.val.length > 0) props.name = name.val()
  if (!desc.is(":disabled") && desc.val.length > 0) props.description = desc.val()

  setIfNonEmpty(fov_name, "name")
  setIfNonEmpty(fov_desc, "description")
  setIfNonEmpty(fov_enc, "encoding")
  setIfNonEmpty(fov_feat, "feature")

  if(Object.keys(feat).length === 4) props.featureOfInterest = feat

  return JSON.stringify(props)
}

function setCustomProps() {
  let dialog = document.getElementById("my-dialog2")
  dialog.dataset["cp_" + $("#cp_dss").val()] = customProps()
}

function clearCustomProps() {
  let dialog = document.getElementById("my-dialog2")
  if (dialog.dataset !== undefined) {
    for(var k in dialog.dataset) {
      delete dialog.dataset[k]
    }
  }
  $("#cp_name").prop("disabled", true)
  $("#cp_desc").prop("disabled", true)
  $("#cp_fov_name").prop("disabled", true)
  $("#cp_fov_desc").prop("disabled", true)
  $("#cp_fov_enc").prop("disabled", true)
  $("#cp_fov_feat").prop("disabled", true)
  $("#check-1").prop("checked", false)
  $("#check-2").prop("checked", false)
  $("#check-3").prop("checked", false)
}

function toggleEnabled(id) {
  $("#"+id).prop('disabled', function(i, v) { return !v; })
}

function toggleGraphMenu(){
    let graphMenu = $("#mynetwork ons-toolbar")
    let graphMenuToggleIcon = $("#toggle-graph-menu")[0]
    graphMenu.slideToggle(e => {
      if (graphMenu.is(":visible")) {
        graphMenuToggleIcon.setAttribute("icon", "md-chevron-up")
      } else {
        graphMenuToggleIcon.setAttribute("icon", "md-chevron-down")
      }
    })
}

let datastreamChart = document.createElement("ons-card")
datastreamChart.innerHTML = `<div class="title" style="border-bottom: 1px solid #CAD3C8;">
      Real-time data
    </div>
    <div class="content" id="ds_chart"></div>
  </ons-card>`

let datastreamWS = document.createElement("ons-card")
datastreamWS.innerHTML = `<div class="title" style="border-bottom: 1px solid #CAD3C8;">
      Peek into this DataStream
    </div>
    <div class="content">
      <ons-button onclick="obsDatastream();">Read Obs.</ons-button>
      <div id="ds-obs"></div>
    </div>
  </ons-card>`

function hideDevCfg() {
  devcfgMenu = $('#devCfg')
  let devcfgMenuToggleIcon = $("#toggle-devcfg-menu")[0]
  devcfgMenu.slideToggle(e => {
    if (devcfgMenu.is(":visible")) {
      devcfgMenuToggleIcon.setAttribute("icon", "md-chevron-up")
    } else {
      devcfgMenuToggleIcon.setAttribute("icon", "md-chevron-down")
    }
  })
}

let deviceCreationForm = document.createElement("ons-card")
deviceCreationForm.innerHTML = `<div class="title" style="border-bottom: 1px solid #CAD3C8;">
      Create a device with this Driver
    </div>
    <div class="content">
      <div style="text-align: center; margin-top: 30px;">
        <p><ons-input id="devName" modifier="underbar" placeholder="name" float></ons-input></p>
        <p><ons-input id="devDesc" modifier="underbar" placeholder="Brief description" float></ons-input></p>
        <p><ons-input id="devMetadataEncoding" modifier="underbar" placeholder="application/pdf" float></ons-input></p>
        <p><ons-input id="devMetadataURI" modifier="underbar" placeholder="http://example.org/schema.pdf" float></ons-input></p>
       <div>
         <ons-toolbar-button onclick="">
           <ons-icon icon="fa-sliders" onclick="showCfgDialog()"></ons-icon>
         </ons-toolbar-button>
         <ons-toolbar-button onclick="showPropsDialog();">
           <ons-icon icon="fa-edit"></ons-icon>
         </ons-toolbar-button>
       </div>
       <p style="margin-top: 30px;"><ons-button onclick="createDeviceFromDriver();clearCustomProps();">Create</ons-button></p>
    </div>
  </ons-card>`

let graphMenu = document.createElement("div")
graphMenu.innerHTML =
`<ons-toolbar style="display: none;">
  <div class="left">
    <ons-toolbar-button onclick="openClusters()">
      <ons-icon icon="fa-expand"></ons-icon>
    </ons-toolbar-button>
    <ons-toolbar-button onclick="clusterTasks()">
      <ons-icon icon="fa-compress"></ons-icon>
    </ons-toolbar-button>
  </div>
</ons-toolbar>`

let taskDebug = document.createElement("ons-card")
taskDebug.innerHTML = `<div class="title" style="border-bottom: 1px solid #CAD3C8;">
      Execute Task
    </div>
    <div class="content">
      <ons-row>
        <ons-col width="30%">
          <ons-button onclick="sendTask();">Send</ons-button>
        </ons-col>
        <ons-col width="70%">
          <textarea id ="task-msg-area" class="textarea" rows="5" style="width:100%;"></textarea>
        </ons-col>
      </ons-row>
      <ons-row style="margin-top: 4%;">
        <ons-col><a style="font-size:1.2em;" id ="task-result"></a></ons-col>
      </ons-row>
    </div>
  </ons-card>`

function createChart(ds) {

    let item = document.createElement("div")
    item.setAttribute("style", "border: 1px solid #0d0d0d;")

    let datastream = ds

    let id = datastream + new Date().getTime()

    item.setAttribute("id", id)

    item.innerHTML =
    `<canvas style="width:100%; height:80px"></canvas>`

    var chart = new SmoothieChart({millisPerPixel: 49,
      maxValueScale: 1.1,
      minValueScale: 1.1,
      responsive: true,
      grid: {
        fillStyle:'#2C3A47'//'#112334'
      }}),
      canvas = item.querySelector("canvas"),
      series = new TimeSeries();

      chart.addTimeSeries(series, {lineWidth:1.4,strokeStyle:'#d6a2e8', fillStyle:"rgb(214, 162, 232, 0.3)"});
      chart.streamTo(canvas, 1000);

      let ws = new WebSocket("ws://localhost:8081/" + datastream);
      ws.onmessage = function(event) {
        let json = JSON.parse(event.data)
        if (json != undefined) {
          series.append(new Date().getTime(), json);
        }
      }
      return item
  }
