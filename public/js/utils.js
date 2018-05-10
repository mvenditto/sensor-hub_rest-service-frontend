/*let auditWs = new WebSocket("ws://localhost:8081/audit");
auditWs.onmessage = function(event) {
  let json = JSON.parse(event.data)
  if (json != undefined) {
    console.log(json)
  }
}*/


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
     `<div class="title" style="color: #4286f4; border-bottom: 1px solid #4286f4;">${cardTitle}</div>
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

let datastreamWS = document.createElement("ons-card")
datastreamWS.innerHTML = `<div class="title" style="color: #4286f4; border-bottom: 1px solid #4286f4;">
      Peek into this DataStream
    </div>
    <div class="content">
      <ons-row>
        <ons-col width="30%">
          <ons-button onclick="obsDatastream();">Read Obs.</ons-button>
        </ons-col>
        <ons-col width="70%" id="ds-obs">
        </ons-col>
      </ons-row>
    </div>
  </ons-card>`

let deviceCreationForm = document.createElement("ons-card")
deviceCreationForm.innerHTML = `<div class="title" style="color: #4286f4; border-bottom: 1px solid #4286f4;">
      Create a device with this Driver
    </div>
    <div class="content">
      <div style="text-align: center; margin-top: 30px;">
        <p><ons-input id="devName" modifier="underbar" placeholder="name" float></ons-input></p>
        <p><ons-input id="devDesc" modifier="underbar" placeholder="Brief description" float></ons-input></p>
        <p><ons-input id="devMetadataEncoding" modifier="underbar" placeholder="application/pdf" float></ons-input></p>
        <p><ons-input id="devMetadataURI" modifier="underbar" placeholder="http://example.org/schema.pdf" float></ons-input></p>
        <p style="color: gray;">configuration [optional]:</p>
        <p><textarea id ="devCfg" class="textarea" rows="10" style="width:100%;"></textarea></p>
        <p style="margin-top: 30px;"><ons-button onclick="createDeviceFromDriver();">Create</ons-button></p>
      </div>
    </div>
  </ons-card>`

let taskDebug = document.createElement("ons-card")
taskDebug.innerHTML = `<div class="title" style="color: #4286f4; border-bottom: 1px solid #4286f4;">
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
