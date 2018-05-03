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

        <p style="margin-top: 30px;"><ons-button onclick="createDeviceFromDriver();">Create</ons-button></p>
      </div>
    </div>
  </ons-card>`
