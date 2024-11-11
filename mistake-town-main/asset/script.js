apx.addEventListener("pageBubble", function (Event, ctx) {
  with (ctx) {
    /**
     * @brief 페이지 생성 시 호출
     */
    var onPageCreate = function () {
      $W("mlc$dropArea").tag.id = "dropArea";
      $W("div$qrcode").tag.style.width = "100%";
      $W("div$qrcode").tag.style.height = "100%";
      $W("it$input").tag.id = "inputText";
      $W("i$drag_", undefined, { multiple: true, like: true }).forEach(
        function (drag) {
          drag.local.originPos = {
            x: drag.get("x"),
            y: drag.get("y"),
            w: drag.get("w"),
            h: drag.get("h"),
          };
          drag.tag.style.cursor = "url('./asset/mouse.png'), auto";
        }
      );
      set("$drag:upscale", 1.2);
      set("$clone:count", 0);
      set("$clone:data", []);

      document.body.style.cursor = "url('./asset/mouse.png'), auto";
    };

    /**
     * @brief 페이지 실행 시 호출
     */
    var onPageRun = function () {
      blink($W("i$effect_1"), 2000, { timing: "ease-in-out 2000ms" });
      blink($W("i$effect_2"), 1000, { timing: "ease-in-out 1000ms" });
      blink($W("i$effect_3"), 1500, { timing: "ease-in-out 1500ms" });
    };

    /**
     * @brief 2페이지로 이동
     */
    var onNextPage1 = function () {
      stopBlink($W("i$effect_1"));
      stopBlink($W("i$effect_2"));
      stopBlink($W("i$effect_3"));
      blinkZoom($W("i$green"), 1000, { timing: "ease-in-out 1000ms" });
      $W("mlc$main").changeState("Layer2");
      $W("a$click").changeState("Play");
    };

    /**
     * @brief 3페이지로 이동
     */
    var onNextPage2 = function () {
      stopBlink($W("i$green"));
      $W("mlc$main").changeState("Layer3");
      $W("a$click").changeState("Play");
    };

    /**
     * @brief 4페이지로 이동
     */
    var onNextPage3 = function () {
      setTimeout(function () {
        $W("it$input").run("focus", true);
      }, 500);
      $W("mlc$main").changeState("Layer4");
      $W("a$click").changeState("Play");
    };

    /**
     * @brief 5페이지로 이동
     */
    var onNextPage4 = function () {
      opacityBlink($W("mt$centerMsg"), 500, { timing: "ease-in-out 500ms" });
      $W("mlc$main").changeState("Layer5");
      $W("a$click").changeState("Play");
    };

    /**
     * @brief 6페이지로 이동
     */
    var onNextPage5 = function () {
      onCreateImageAndQrCode();
      var main = $W("mlc$main");
      main.changeState("Layer6");

      var totalDuration = 5000; // 총 지속 시간을 변수로 설정 (ms)
      var progressWidth = 800; // 프로그레스 바의 너비

      var loadingVal = 0;
      var interval = 20; // 20ms마다 값을 업데이트 (값이 너무 작으면 애니메이션이 끊길 수 있음)
      var maxValue = progressWidth; // 최대값 800
      var steps = totalDuration / interval; // 총 실행할 스텝 수
      var increment = maxValue / steps; // 각 스텝마다 증가할 값 계산

      $W("a$loading").changeState("Play");

      var intervalId = setInterval(function () {
        loadingVal += increment;
        if (loadingVal >= maxValue + 1) {
          loadingVal = maxValue; // 800으로 고정
          clearInterval(intervalId); // 카운트 완료 시 interval 종료
          main.changeState("Layer7");
          blink($W("i$effect_4"), 2000, { timing: "ease-in-out 2000ms" });
          blink($W("i$effect_5"), 1000, { timing: "ease-in-out 1000ms" });
          blink($W("i$effect_6"), 1500, { timing: "ease-in-out 1500ms" });
          $W("a$loading").changeState("Stop");
        }
        // 백분율로 변환 (0 ~ 800 범위에서 100%로 변환)
        var percentage = Math.floor((loadingVal / maxValue) * 100);
        $W("t$loading").set("text", percentage + "%"); // 백분율 텍스트 업데이트
        $W("r$progressMake").set("w",loadingVal);
      }, interval);
    };

    /**
     * @brief 이미지 클릭 시 호출
     */
    var onClickCloneImage = function () {
      var target = Event.target;
      var targetNum = target.get("label").split("_")[1];
      target.set("visibility", "hidden");
      var newData = get("$clone:data").filter(function (item) {
        return item.idx != targetNum;
      });
      set("$clone:data", newData);
      setProgress();
      $W("a$click").changeState("Play");
    };

    /**
     * @brief 드래그 시작 시 호출
     */
    var onDragStart = function () {
      var target = Event.target;
      var centerMsg = $W("mt$centerMsg");
      target.sizeTo(
        target.get("w") * get("$drag:upscale"),
        target.get("h") * get("$drag:upscale")
      );
      centerMsg.set("visibility", "hidden");
      stopBlink(centerMsg);
      $W("a$click").changeState("Play");
    };

    /**
     * @brief 드래그 종료 시 호출
     */
    var onDragEnd = function () {
      // 8개 이상 일 경우 복사 안되도록
      if( get("$clone:data").length > 7 ) {
        return;
      }
      var target = Event.target;
      var dropArea = $W("mlc$dropArea");
      if (checkInArea(target, dropArea)) {
        set("$clone:count", get("$clone:count") + 1);
        var newImage = target.clone(dropArea.id, "Layer1");
        newImage.zIndexTo("Top");
        newImage.sizeTo(target.get("w"), target.get("h"));
        newImage.moveTo(target.get("x"), target.get("y"));
        newImage.set("dragX", false);
        newImage.set("dragY", false);
        newImage.set("label", "i$clone_" + get("$clone:count"));
        get("$clone:data").push({
          idx: get("$clone:count"),
          t: target.get("label").split("_")[1],
          x: Math.round(newImage.get("x")),
          y: Math.round(newImage.get("y")),
          w: Math.round(newImage.get("w")),
          h: Math.round(newImage.get("h")),
        });
      }
      setProgress();
    };

    /**
     * @brief 프로그래스 애니메이션 실행
     */
    var setProgress = function () {
      $W("mlc$progress").changeState("Layer" + get("$clone:data").length);
      //calculateProgress(get("$clone:data").length, 8);
      setOopsText();
    };

    /**
     * @brief 프로그래스 바 백분율 계산
     */
    var calculateProgress = function (value, maxValue) {
      if (value > maxValue) {
        return;
      }
      var progressWgt = $W("r$progress");
      var progressBarWidth = 700; // 프로그레스 바의 총 너비
      var percentage = (value / maxValue) * 100; // 백분율 계산
      var progressWidth = (progressBarWidth * percentage) / 100; // 프로그레스 바에서 차지하는 너비 계산
      if (progressWidth === 0) progressWidth = 1;
      progressWgt.sizeTo(progressWidth, progressWgt.get("h"), {
        timing: "linear 300ms",
      });
    };

    /**
     * @brief 프로그래스 애니메이션 실행
     */
    var setOopsText = function () {
      var oopsText = $W("mlc$oopsText");
      var oopsVal = get("$clone:data").length;
      
      if (oopsVal > 0) {
        if (oopsVal >= 1 && oopsVal <= 3) {
          oopsText.changeState("Layer2");
        } else if (oopsVal >= 4 && oopsVal <= 6) {
          oopsText.changeState("Layer3");
        } else if (oopsVal >= 7) {
          oopsText.changeState("Layer4");
        }
      } else {
        oopsText.changeState("Layer1");
      }
    };

    /**
     * @brief 완전히 드랍 됐을 경우
     */
    var onDropResult = function () {
      var target = Event.target;
      target.sizeTo(target.local.originPos.w, target.local.originPos.h);
      target.moveTo(target.local.originPos.x, target.local.originPos.y);
    };

    /**
     * @brief 마우스 오버 시 호출
     */
    var onMouseOver = function () {
      Event.target.zoomTo(110, 110);
    };

    /**
     * @brief 마우스 아웃 시 호출
     */
    var onMouseOut = function () {
      Event.target.zoomTo(100, 100);
    };

    /**
     * @brief 웁스 텍스트 변화 시 호출
     */
    var onStateChangeOopsText = function () {
      var target = Event.target;
      var popup = $W("mlc$popup");
      var popupImg = $W("i$popup");
      target.zoomTo(120, 120, {
        timing: "linear 300ms",
        onEnd: function () {
          target.zoomTo(100, 100, { timing: "linear 300ms" });
        },
      });
      if(target.get("state") == "Layer4") {
        popup.zIndexTo("Top");
        popup.moveTo(0, 0);
        popupImg.zoomTo(120, 120, {
        timing: "linear 300ms",
        onEnd: function () {
          popupImg.zoomTo(100, 100, { timing: "linear 300ms" });
        },
        });
        setTimeout(function(){
          popup.moveTo(1080, 0);
        }, 2000);
        $W("a$megaoops").changeState("Play");
      }
    };

    /**
     * @brief 이미지와 QR 코드를 생성
     */
    var onCreateImageAndQrCode = function () {
      // 최대한 짧은 문자열로 포맷 후 URI 인코딩
      var serializedData = encodeURIComponent(formatData(get("$clone:data")));
      var qrCode = new QRCodeStyling({
        width: 170,
        height: 170,
        type: "canvas",
        data:
          "https://jiyuuukim.github.io/mistake-town/qr/index.html?image=" +
          serializedData,
        dotsOptions: {
          color: "#000000",
          type: "rounded",
        },
        backgroundOptions: {
          color: "#ffffff",
        },
        imageOptions: {
          crossOrigin: "anonymous",
          margin: 0,
        },
      });

      qrCode.append(document.getElementById("qrcode"));

      window
        .html2canvas(document.querySelector("#dropArea"), {
          backgroundColor: null,
        })
        .then(function (canvas) {
          var dataURL = canvas.toDataURL("image/png");
          $W("i$myError").set("media", dataURL);
        });
    };

    /**
     * @brief 문자열 데이터 포맷
     */
    var formatData = function () {
      return get("$clone:data")
        .map(function (item) {
          return (
            item.t + "," + item.x + "," + item.y + "," + item.w + "," + item.h
          );
        })
        .join("|");
    };

    /**
     * @brief 위젯을 위아래로 움직임
     * @param {int} delay 딜레이 (1/1000초)
     * @param {object} param opacityTo param 객체 (nullable)
     */
    var blink = function (widget, delay, param) {
      widget.local.isBlink = !widget.local.isBlink;
      widget.moveBy("", widget.local.isBlink ? -50 : 50, param);
      var wgt = widget;
      wgt.local.blinkTimeoutId = setTimeout(function () {
        blink(wgt, delay, param);
      }, delay);
    };

    /**
     * @brief 위젯 움직임을 멈춤
     */
    var stopBlink = function (widget) {
      if (widget.local.blinkTimeoutId) {
        clearTimeout(widget.local.blinkTimeoutId);
        widget.local.blinkTimeoutId = undefined;
      }
      widget.local.isBlink = undefined;
    };

    /**
     * @brief 위젯을 커졌다 작아졌다 하는 애니메이션
     * @param {int} delay 딜레이 (1/1000초)
     * @param {object} param opacityTo param 객체 (nullable)
     */
    var blinkZoom = function (widget, delay, param) {
      widget.local.isBlink = !widget.local.isBlink;
      widget.zoomTo(
        widget.local.isBlink ? 150 : 100,
        widget.local.isBlink ? 150 : 100,
        param
      );
      var wgt = widget;
      wgt.local.blinkTimeoutId = setTimeout(function () {
        blinkZoom(wgt, delay, param);
      }, delay);
    };

    /**
     * 위젯을 깜빡이게 함
     *
     * @param {int} delay 딜레이 (1/1000sec)
     * @param {object} param opacityTo param 객체   @nullable
     *
     */
    var opacityBlink = function (widget, delay, param) {
      widget.local.isBlink = !widget.local.isBlink;
      widget.opacityTo(widget.local.isBlink ? 0 : 0.6, param);

      var wgt = widget;
      wgt.local.blinkTimeoutId = setTimeout(function () {
        opacityBlink(wgt, delay, param);
      }, delay);
    };

    /**
     * @brief 위젯의 가운데 좌표를 반환
     * @param {Widget} widget 해당 위젯
     * @returns {object} obj (x좌표, y좌표)
     */
    var getCenterPos = function (widget) {
      return {
        x: widget.get("x") + widget.get("w") / 2,
        y: widget.get("y") + widget.get("h") / 2,
      };
    };

    /**
     * @brief 위젯이 영역 안에 있는지 확인
     * @param {Widget} widget 해당 위젯
     * @param {Widget} areaWgt 영역 위젯
     * @returns {boolean} 영역 안에 있는지 여부
     */
    var checkInArea = function (widget, areaWgt) {
      var dragPos = getCenterPos(widget);
      var areaPos = {
        widthLeft: areaWgt.get("x"),
        widthRight: areaWgt.get("x") + areaWgt.get("w"),
        heightTop: areaWgt.get("y"),
        heightBottom: areaWgt.get("y") + areaWgt.get("h"),
      };
      return (
        dragPos.x > areaPos.widthLeft &&
        dragPos.x < areaPos.widthRight &&
        dragPos.y > areaPos.heightTop &&
        dragPos.y < areaPos.heightBottom
      );
    };

    if (!Event.target) {
      if (Event.type === "Page Create") {
        onPageCreate();
      } else if (Event.type === "Page Run") {
        onPageRun();
      }
    } else {
      var label = Event.target.get("label");
      if (Event.type == "Tap") {
        if (label == "r$button") {
          onClickButton();
        } else if (label == "b$home") {
          $W("a$click").changeState("Play");
          reset();
        } else if (label == "b$next_1") {
          onNextPage1();
        } else if (label == "b$next_2") {
          onNextPage2();
        } else if (label == "b$next_3") {
          onNextPage3();
        } else if (label == "b$next_4") {
          onNextPage4();
        } else if (label == "b$next_5") {
          onNextPage5();
        } else if (label.indexOf("i$clone_") > -1) {
          onClickCloneImage();
        }
      } else if (Event.type == "Drag Start") {
        if (label.indexOf("i$drag_") > -1) {
          onDragStart();
        }
      } else if (Event.type == "Drag End") {
        if (label.indexOf("i$drag_") > -1) {
          onDragEnd();
        }
      } else if (Event.type == "Drop Result") {
        onDropResult();
      } else if (Event.type == "Mouse Over") {
        if (label.indexOf("b$next_") > -1 || label == "b$home") {
          onMouseOver();
        }
      } else if (Event.type == "Mouse Out") {
        if (label.indexOf("b$next_") > -1 || label == "b$home") {
          onMouseOut();
        }
      } else if (Event.type == "State Change") {
        if (label == "mlc$oopsText") {
          onStateChangeOopsText();
        }
      }
    }
  }
});
