apx.addEventListener("pageBubble", function (Event, ctx) {
  with (ctx) {
    /**
     * @brief Page Create
     */
    var onPageCreate = function () {
      $W("mlc$dropArea").tag.id = "dropArea";
      $W("mlc$capture").tag.id = "capture";

      var parsedImageData = decodeURIComponent(getQueryParamValue("image"));

      if (parsedImageData !== null) {
        parsedImageData.split("|").forEach(function (item) {
          item = item.split(",");
          var cloneWgt = $W("i$drag_" + item[0]).clone(
            $W("mlc$dropArea").id,
            "Layer1"
          );
          cloneWgt.moveTo(item[1], item[2]);
          cloneWgt.sizeTo(item[3], item[4]);
          cloneWgt.zIndexTo("Top");
        });
      }

      window
        .html2canvas(document.querySelector("#dropArea"), {
          backgroundColor: null,
        })
        .then(function (canvas) {
          var dataURL = canvas.toDataURL("image/png");
          $W("i$myError").set("media", dataURL);
          $W("mlc$dropArea").set("visibility", "hidden");
          window
            .html2canvas(document.querySelector("#capture"), {
              backgroundColor: null,
            })
            .then(function (canvas) {
              var dataURL = canvas.toDataURL("image/png");
              $W("i$image").set("media", dataURL);
            });
        });
    };

    /**
     * @brief Page Run
     */
    var onPageRun = function () {};

    var getQueryParamValue = function (paramName) {
      var params = new URLSearchParams(window.location.search);
      return params.get(paramName);
    };

    if (!Event.target) {
      if (Event.type === "Page Create") {
        onPageCreate();
      } else if (Event.type === "Page Run") {
        onPageRun();
      }
    }
  }
});
