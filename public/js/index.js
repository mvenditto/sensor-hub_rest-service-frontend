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

var showTemplateDialog = function() {
  var dialog = document.getElementById('my-dialog');

  if (dialog) {
    dialog.show();
  } else {
    ons.createElement('dialog.html', { append: true })
      .then(function(dialog) {
        dialog.show();
      });
  }
};

var hideDialog = function(id) {
  document
    .getElementById(id)
    .hide();
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
