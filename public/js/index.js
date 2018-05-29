window.fn = {};

window.fn.open = function() {
  var menu = document.getElementById('menu');
  menu.open();
};

window.fn.load = function(page) {
  var content = document.getElementById('content');
  var menu = document.getElementById('menu');
  content.load(page)
    .then(menu.close.bind(menu));
};

window.fn.loadPage = function(page) {
  var menu = document.getElementById('menu');
  document.querySelector('#content').bringPageTop(page)//.then(menu.close.bind(menu))
  menu.close()
}

var showCfgDialog = function() {
  var dialog = document.getElementById("cfg-dialog")
  if(dialog) {
    dialog.show()
  } else {
    ons.createElement("cfg-dialog.html", { append: true }).then(function(diag) {
      var container = document.getElementById("devCfg");
      var options = {mode:"code"};
      var editor = new JSONEditor(container, options);
      editor.set({})
      diag.show()
    });
  }
}

var showTemplateDialog = function(id, template) {
  var dialog = document.getElementById(id);

  if (dialog) {
    dialog.show()
  } else {
    ons.createElement(template, { append: true }).then(function(diag) {
        diag.show()
    });
  }
};

var hideDialog = function(id, cb) {
  document
    .getElementById(id)
    .hide();
  cb();
};

function showModal() {
  var modal = document.querySelector('ons-modal');
  modal.toggle();
}

function tryLoadSetup() {
  $.getJSON("data/setup-0.json", function(json) {
      $.each(json.devices, dev => {
        let d = json.devices[dev]
        $.post("http://localhost:8081/devices/", JSON.stringify(d), (data) => {
          console.log(data)
          if (data != undefined) {
            console.log("refresh");
            ons.notification.toast('successfully created: ' + JSON.stringify(data), {timeout: 5000, animation: 'fall', modifier:'success' })
            shBuildSystemGraph();
          } else {
            ons.notification.toast('failed to create resource: ' + JSON.stringify(data), {timeout: 5000, animation: 'fall', modifier:'failure' })
          }
        }, "json")
      })
  });
}
