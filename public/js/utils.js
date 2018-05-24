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

        deleteBtn.innerHTML = `<p style="margin-top: 30px;"><ons-button onclick="showTemplateDialog();">Delete</ons-button></p>`
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
      <ons-row>
        <ons-col>
          <ons-button onclick="obsDatastream();">Read Obs.</ons-button>
          <div id="ds-obs"></div>
        </ons-col>
      </ons-row>
    </div>
  </ons-card>`

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
        <p>configuration [optional]:</p>
        <p><textarea id ="devCfg" class="textarea" rows="10" style="width:100%;"></textarea></p>
        <p style="margin-top: 30px;"><ons-button onclick="createDeviceFromDriver();">Create</ons-button></p>
      </div>
    </div>
  </ons-card>`

let graphMenu = document.createElement("div")
graphMenu.innerHTML =
`<ons-toolbar>
  <div class="left">
    <ons-toolbar-button onclick="">
      <ons-icon icon="md-plus"></ons-icon>
    </ons-toolbar-button>
    <ons-toolbar-button onclick="collapseNode()">
      <ons-icon icon="md-minus"></ons-icon>
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
        fillStyle:'#112334'
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
