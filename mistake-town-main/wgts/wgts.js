///////////////////////////////////////////////////////////////////////////////
// ux.wgt.DIV
/*
	innerHTML의 편집을 지원하므로

	wgt.setData/getData
		HTML
			(이 위젯은 주로 외부에서 직접 innerHTML하므로 필요는 없느나 기능은 제공함)
*/

var xa = {}

xa.styleMap = {
	title:true
	,visibility:true
	,font:true, fontSize:true
	,alpha:true
	,angle:true
	,dragX:true, dragY:true, dragInParent:true, dragContainParent:true
}

xa.scriptInfo = {
	wgtData:{HTML:{help:{ko:"String\nDIV의 'innerHTML'에 지정할 HTML입니다.",en:"String\nHTML string to be set as 'innerHTML'."}}}
}

xa.editor = {
	iconThumb:'DB/ux/imgs/wgts/thumbs/tag.png'
}

xa.properties = {
	attrs:{
		HTML:''
	}
}

xa.createAsCanvasObject = apn.widgets['apn.wgt.rect'].createAsCanvasObject; //%INFO ADD할 경우가 없으므로 사용되지 않는 함수임
xa.exeRenderTag = apn.widgets['apn.wgt.rect'].exeRenderTag;
xa.exeCreateTag = apn.widgets['apn.wgt.rect'].exeCreateTag;

xa.exeOnLoad = function(apx, oId)
{
	this._htmlSet(apx, oId);

	var _this = this;

	//	HTML set, <body> TAG 및 <head> TAG에 해당하는 HTML를 지정합니다.
	function onSetHTML(changeWgtId, value)
	{
		if (changeWgtId == oId){
			_this._htmlSet(apx, oId);
		}
	}
	apx.wgtListenProperty(oId, 'HTML', onSetHTML);
}

xa.exeOnScreenRefresh = function(apx, oId, opts)
{
	var tag = apx.wgtTag(oId);

	// Text가 있으면 다시 Set함. Virtical Align 경우 Font의 크기에 영향을 받음
	var text, refresh = true;

	if (opts && opts.font && opts.font != apx.wgtGetProperty(oId, 'apxFont', /*Resolve*/true)) refresh = false; // Font가 다르면 Skip

	if (refresh){
		apx.fireEvent('contentChange', 'font', oId, /*always*/true);
	}
}

xa._htmlSet = function(apx, oId)
{
	var html;

	if ((html = apx.wgtGetProperty(oId, 'HTML'))){
		if (!apx.sptExeIsPreview() || apn.Project.getScriptVer(apx.project) == 2){
			apx.wgtTag(oId).innerHTML = html;
		}
		else{
			apx.wgtTag(oId).innerHTML = 'This is supporeted with Aspen Scripting Ver2.';
		}
	}
}

xa.edtOnCheckContentChange = function(prj, pId, oId)
{
	return {font:'Font'};
}

xa.edtOnConfig = function(/*CEditor*/apd, oId)
{
	var buf = {HTML:apd.wgtGetProperty(oId, 'HTML')};
	var tagDlg;

	function onOK1()
	{
		eduLib.edtInputApplyAll(apd, tagDlg);
		apd.wgtSetProperty(oId, 'HTML', buf.HTML);
		//apd.wgtRefreshUI(oId);
	}

	if (tagDlg = apd.dlgDoModal(Math.ceil(bx.UX.width*0.8), 760, onOK1)){
		eduLib.edtInputAdd(apd, tagDlg, {type:'title', title:'HTML', join:true});
		eduLib.edtInputAdd(apd, tagDlg, {type:'text', value:buf, key:'HTML', multiline:true, height:'600px', join:true});
	}
}

uxWgtDIV = xa;
////////////////////////////////////////////////////////////////////////////////
// ux.wgt.sceneScrl
/*
*/

var xa = apn.inheritWidget(apn.widgets['apn.wgt.rect']);
xa.styleMap = {
	title:true
	,visibility:true
	,strokeStyle:true, lineWidth:true, lineDash:true
	,borderRadiusTopLeft:true, borderRadiusTopRight:true, borderRadiusBottomLeft:true, borderRadiusBottomRight:true
	,fillStyle:true
	,alpha:true
}
xa.exeItrNoResize = true;

xa.editor.iconThumb = 'DB/ux/imgs/wgts/thumbs/animation.png';

xa.editor.states = {p:'Play', ps:'Pause', rp:'Replay'};

xa.properties = xa.properties || {}
xa.properties.state = 'p';
xa.properties.attrs = {
	cfg:{
		spd:20 // 기준 속도: pixel/sec
		,pos:'B' // 기준위치-방향: 'B'|'T'|'L'|'R'
		,ptn:[{i:{mediaID:undefined}, p:0, spd:1, d:'LT'}] // p: 위치 in pixel, d: 방향 Left/Top(-) or Right/Bottom(+), spd:spd의 배수
	}
};

xa.scriptInfo = {
	wgtData:{
		controller:{ver:2, help:{ko:"위젯의 동작을 제어하기 위한 모듈입니다.",en:"Module to control this widget"}, value:'Class', type:'go'}
		,speed:{help:{ko:"스크롤 속도",en:"Scroll speed"}, value:'Number'}
	}
};

xa.exeSetState = function(apx, tag, /*String*/state)
{
	if (!tag.ctx) return;

	if (state == 'p'){ // Play
		tag.ctx.isPlay = true;
	}
	else if (state == 'ps'){ // Pause
		tag.ctx.isPlay = false;
	}
	else if (state == 'rp'){ // Replay
		tag.ctx.isPlay = true;

		this._setSpd(apx, tag, tag.ctx.cfg._spdOrg);
		this._init(tag);
				
		//	외부 연동 정보
		if (tag.ctx._loop){
			tag.ctx._loop.detach(undefined, /*all*/true); // 위젯을 삭제함. Event 발생 목적
			tag.ctx._uWgts = undefined;
			tag.ctx._uTrgs = undefined;

			tag.ctx._loop.fire(0, 'restarted');
		}
	}
}

xa.exeOnLoad = function(apx, oId)
{
	var tag = apx.wgtTag(oId);
	var cfg = apx.wgtGetProperty(oId, 'cfg');

	// Drawing Canvas
	tag.canvas = tag.$TAG('canvas', {style:'position:absolute;cursor:inherit;'});
	tag.canvas.style.left = '0px';
	tag.canvas.style.top = '0px';

	/*	Chrome은 정수 절단에서 안전하므로 값을 그대로 표시함
		그외는 Canvas scale()에서 정수 절단이 발생하므로, CSS로 처리함
	*/
	if (bx.HCL.DV.isChrome()){
		tag.canvas.width = parseInt(tag.style.width);
		tag.canvas.height = parseInt(tag.style.height);
		tag.canvas.style.width = tag.style.width;
		tag.canvas.style.height = tag.style.height;

		tag.canvas.getContext('2d').scale(1/apx.getZoomX(), 1/apx.getZoomY());
	}
	else{
		tag.canvas.width = apx.wgtW(oId);
		tag.canvas.height = apx.wgtH(oId);
		tag.canvas.style.width = apx.wgtW(oId)+'px';
		tag.canvas.style.height = apx.wgtH(oId)+'px';

		if (apx.getZoomX() != 1 || apx.getZoomY() != 1){
			tag.canvas.$CSS({transformOrigin:'0 0', transform:'scale('+1/apx.getZoomX()+','+1/apx.getZoomY()+')'});
		}
	}

	//	이미지가 없는 항목은 제거함
	for(var i = 0; i < cfg.ptn.length; i ++){
		if (!cfg.ptn[i].i.mediaID){
			cfg.ptn.splice(i, 1);
			i --;
		}
	}

	tag.ctx = {};
	tag.ctx.cfg = cfg;
	tag.ctx.times = new Array(cfg.ptn.length);
	tag.ctx.dist = 0; // 진행 거리를 통보하기 위한 것임. 즉 위의 times[]와 비교하면 정속도 1배 기준값이 되는 것임
	tag.ctx.imgs = {};
	tag.ctx.ptns = cfg.ptn;
	tag.ctx.isRun = true;
	tag.ctx.isPlay = /*OLD*/!apx.wgtGetProperty(oId, 'apxState') ? true : false; // By Widget State

	tag.ctx._isChrome = bx.HCL.DV.isChrome();
	tag.ctx.orgW = apx.screen.objects[oId].init.shape.w;
	tag.ctx.orgH = apx.screen.objects[oId].init.shape.h;
	tag.ctx.ctx = tag.canvas.getContext('2d');
	
//	cfg.spd = bx.$checkNaN(parseFloat(cfg.spd));

	//	Load images
	for(var i = 0; i < cfg.ptn.length; i ++){
		tag.ctx.imgs[i] = {url:apx.mediaURL(cfg.ptn[i].i.mediaID)};

//		tag.ctx.ptns[i]._spd = cfg.spd*bx.$checkNaN(parseFloat(cfg.ptn[i].spd)); // 속도 계산 저장
		tag.ctx.ptns[i]._pos = 0;
		tag.ctx.ptns[i]._totalTick = 0;
	}

	this._setSpd(apx, tag, cfg.spd, /*init*/true);

	var _this = this;

	function onLoad(cntAll, cntSucc, cntErr)
	{
		if (cntAll == cntSucc){
			tag.ctx._imgLoaded = true;

			if (apx.wgtGetProperty(oId, 'apxState') != 'ps'){ // Pasued
				_this._init(tag);
			}
			else{
				for(var i = 0; i < tag.ctx.ptns.length; i ++){
					_this._init(tag, /*paused*/true);
					_this._drawPtn(apx, tag.ctx.ctx, tag, i, 0);
				}
			}
		}
		else{
			apx.log(oId, 'Failed to load '+cntErr+' images.');
		}
	}
	new apn.CRscLoader().load(apx.project, tag.ctx.imgs, onLoad);
}

xa.exeOnPause = function(apx, oId)
{
	var tag = apx.wgtTag(oId);

	tag.ctx.isRun = false; // Pause;
}


/*	특별히 Offset 계산을 해서 오차를 정밀하게 해도 사실 이 위젯 특성상 크게 효율이 높은 것도 아니고
	오히려 덜덜거리는 느낌이 남.
	IE/Firefox의 경우, Canvas에 Int로 주지 않으면 Zoom에서 떨어져 보임. 그런데 Chrome에서 Int처리하면 덜덜 거리는 느낌이 남
*/
xa.exeOnTick = function(apx, oId, tmTick)
{
	var tag = apx.wgtTag(oId);

	if (!tag.ctx._imgLoaded) return;

	if (!tag.ctx.isRun || !tag.ctx.isPlay){
		if (!tag.ctx.isRun) tag.ctx.isRun = true; // Pause상태에서는 Tick이 멈추기, Pause상태에서 Tick이 발생하면 Resume이 된 것임.

		for(var i = 0; i < tag.ctx.times.length; i ++){
			tag.ctx.times[i] = tmTick;
		}
		tag.ctx.dist = tmTick;
		return;
	}

	//	Clear and draw
	tag.ctx.ctx.clearRect(0, 0, tag.ctx.orgW, tag.ctx.orgH);

	for(var i = 0; i < tag.ctx.ptns.length; i ++){
		this._drawPtn(apx, tag.ctx.ctx, tag, i, tmTick);
	}

	var pxDist = 0; // 이동거리 in PX

	//	기준 거리를 계산함. 외부에 통보하기 위함
	if (tag.ctx.dist == 0){
		tag.ctx.dist = tmTick;
		
		pxDist = 0;
		tag.ctx._distPxLastFire = pxDist;
		if (tag.ctx._loop) tag.ctx._loop.fire(pxDist); // 0은 반드시 발생함
	}
	else{
		tag.ctx._distTotalTick += (tmTick - tag.ctx.dist);
		tag.ctx.dist = tmTick;
		
		pxDist = Math.round(tag.ctx.cfg.spd*tag.ctx._distTotalTick/1000);

		if (pxDist != tag.ctx._distPxLastFire){
			tag.ctx._distPxLastFire = pxDist;
			if (tag.ctx._loop) tag.ctx._loop.fire(pxDist);
		}
	}

	//	Trigger 발생 - Distance보다 크거나 같으면 발생하고, Rewind 기능이 없으므로 Trigger를 바로 삭제함
	if (tag.ctx._uTrgs){
		for(i in tag.ctx._uTrgs){
			if (pxDist >= tag.ctx._uTrgs[i]){
				tag.ctx._loop.fire(pxDist, 'trigger', i);
				delete tag.ctx._uTrgs[i];
			}
		}
	}

	var buf;

	//	연결된 위젯을 Scroll함
	if (tag.ctx._uWgts && tag.ctx._uWgts.length){
		for(i = 0; i < tag.ctx._uWgts.length; i ++){
			buf = tag.ctx._uWgts[i];

			if (buf.from-buf._offset <= pxDist && buf.to-buf._offset >= pxDist){
				if (buf._dir == 'x'){ // X축은 좌표계가 Y축과 역발향임
					apx.wgtMoveTo(buf.object, (buf.from)-pxDist + buf._area);
				}
				else{
					apx.wgtMoveTo(buf.object, undefined, pxDist - (buf.from - buf._offset) - buf._objSize + buf._area);
				}

				if (!buf._in){
					buf._in = true;
					
					//	가속
					if (!apx.viewer.isStretch()) apn.CExe.ACCEL(apx.wgtTag(buf.object));

					if (buf._dir == 'x'){
						if (buf.y !== undefined) apx.wgtMoveTo(buf.object, undefined, buf.y + buf._area);
					}
					else{ // 'y'
						if (buf.x !== undefined) apx.wgtMoveTo(buf.object, buf.x + buf._area);
					}

					tag.ctx._loop.fire(pxDist, 'attached', buf);
				}
			}
			else{
				if (buf._in){
					tag.ctx._uWgts.splice(i, 1);
					i --;

					tag.ctx._loop.fire(pxDist, 'detached', buf);
				}
			}
		}
	}
}

xa.exePropGet = function(apx, oId, key, /*Boolean|undefined*/check)
{
	if (key == 'controller'){
		if (check){
			 return true;
		}
		else{
			var tag = apx.wgtTag(oId);

			if (tag.ctx){
				tag.ctx._loop = tag.ctx._loop || new uxWgtSceneScrlLOOP(apx, tag);
				return tag.ctx._loop;
			}
		}
	}
	else if (key == 'speed'){
		if (check){
			 return true;
		}
		else{
			var tag = apx.wgtTag(oId);

			if (tag.ctx){
				return tag.ctx.cfg.spd;
			}
			else{
				return 0;
			}
		}
	}
}

xa.exePropSet = function(apx, oId, key, value, /*Boolean|undefined*/check)
{
	if (key == 'speed'){
		if (check){
			 return true;
		}
		else{
			var tag = apx.wgtTag(oId);

			if (tag.ctx){
				this._setSpd(apx, tag, value);
			}
		}
	}
}

/*	Speed를 변경할 수 있는 기능을 추가함
	2019/11
*/
xa._setSpd = function(apx, tag, /*Number*/spd, /*Boolean*/_initCall)
{
	var cfg = tag.ctx.cfg;

	spd = bx.$checkNaN(parseFloat(spd)) || /*Eception*/1;

	//	Load images
	for(var i = 0; i < cfg.ptn.length; i ++){
		tag.ctx.ptns[i]._spd = spd*bx.$checkNaN(parseFloat(cfg.ptn[i].spd)); // 속도 계산 저장
	}

	//	Scroll 도중 시간을 바꾼 것이면, '누적 진행 거리'의 개념에 해당하는 값을 모두 보정해야 함
	if (!_initCall){
		//	총 이동 거리(시간)
		if (tag.ctx._distTotalTick){
			tag.ctx._distTotalTick /= (spd/cfg.spd);
		}

		//	각 이미지의 누적 Tick
		for(var i = 0; i < cfg.ptn.length; i ++){
			tag.ctx.ptns[i]._totalTick /= (spd/cfg.spd);
		}
	}
	else{
		cfg._spdOrg = spd;
	}

	cfg.spd = spd;
}

xa._drawPtn = function(apx, ctx, tag, idx, tick)
{
	var img = tag.ctx.imgs[idx].image;

	//	%%INFO 이 함수는 모두 편집 좌표계로 동작함

	if (tag.ctx.times[idx] == 0){ // 시작
		tag.ctx.times[idx] = tick;
		tag.ctx.ptns[idx]._totalTick = 0;
		tag.ctx.ptns[idx]._pos = 0;
	}
	else{
		var tickDiff = tick - tag.ctx.times[idx];

		//	1 pixel 이하의 절단에 대해서는 별도로 관리를 하지 않음. 오히려 흔들려 보임
		tag.ctx.ptns[idx]._totalTick += tickDiff;
		tag.ctx.times[idx] = tick;
		tag.ctx.ptns[idx]._pos = tag.ctx.ptns[idx]._totalTick*tag.ctx.ptns[idx]._spd/1000;
	}

	var x = 0, y = 0;	 // 표시 위치
	var dir = -1; // 방향

	if (tag.ctx.ptns[idx].d == 'RB') dir = 1;

	if (tag.ctx.cfg.pos == 'B'){
		y = tag.ctx.orgH - img.height - bx.$checkNaN(parseInt(tag.ctx.ptns[idx].p));
	}
	else if (tag.ctx.cfg.pos == 'T'){
		y = bx.$checkNaN(parseInt(tag.ctx.ptns[idx].p));
	}
	else if (tag.ctx.cfg.pos == 'R'){
		x = tag.ctx.orgW - img.width - bx.$checkNaN(parseInt(tag.ctx.ptns[idx].p));
	}
	else if (tag.ctx.cfg.pos == 'L'){
		x = bx.$checkNaN(parseInt(tag.ctx.ptns[idx].p));
	}
	//%%INFO Pattern의 경우, 다수를 사용할 때, Buffer Canvas가 없으면 문제가 많기 때문에, 직접 그림

	if (tag.ctx.cfg.pos == 'B' || tag.ctx.cfg.pos == 'T'){ // 가로
		var parts = Math.floor(tag.ctx.ptns[idx]._pos/img.width);
		var sx = tag.ctx.ptns[idx]._pos - parts*img.width;

		if (dir > 0){
			sx = -(img.width - sx);
		}
		else{
			sx = -sx;
		}

		for(var tx = sx; tx < tag.ctx.orgW; tx += img.width){
			//	Math.round()를 하지 않으면 IE, FireFox에서 금이 발생함
			ctx.drawImage(img, tag.ctx._isChrome ? tx : Math.round(tx), y, img.width, img.height);
		}
	}
	else{
		var parts = Math.floor(tag.ctx.ptns[idx]._pos/img.height);
		var sy = tag.ctx.ptns[idx]._pos - parts*img.height;

		if (dir > 0){
			sy = -(img.height - sy);
		}
		else{
			sy = -sy;
		}

		for(var ty = sy; ty < tag.ctx.orgH; ty += img.height){
			//	Math.round()를 하지 않으면 IE, FireFox에서 금이 발생함
			ctx.drawImage(img, x, tag.ctx._isChrome ? ty : Math.round(ty), img.width, img.height);
		}
	}
}

/*	시작 또는 재시작. Image Load 또는 Start에서 자동 시작 요청이 중복으로 발생할 수가 있음.
	forced: 재시작을 지시함
*/
xa._init = function(tag, /*Boolean*/paused)
{
	for(var i = 0; i < tag.ctx.times.length; i ++){
		tag.ctx.times[i] = 0;
	}
	tag.ctx.dist = 0;
	tag.ctx._distTotalTick = 0;
	tag.ctx._distPxLastFire = 0;
}

xa.onEdit = undefined;
xa.edtOnConfig = function(/*CEditor*/apd, objID)
{
	var cfg = apd.wgtGetProperty(objID, 'cfg');
	var tagDlg;

	function onOK()
	{
		eduLib.edtInputApplyAll(apd, tagDlg);

		apd.getObjectByID(objID)._uxWgtSceneScrl_loaded = false;
		apd.wgtRefreshUI(objID);

		apd.wgtSetProperty(objID, 'cfg', cfg);
	}

	if (tagDlg = apd.dlgDoModal(900, 720, onOK)){
		eduLib.edtInputAdd(apd, tagDlg, {type:'number', title:apn.CExe.GL({ko:'스크롤 기준속도',en:'Scroll base speed'})+'[pixel/sec]', value:cfg, key:'spd', join:true});
		eduLib.edtInputAdd(apd, tagDlg, {type:'select', title:apn.CExe.GL({ko:'스크롤 방향 및 이미지 기준위치',en:'Scroll direction and image\'s base position'})
			,options:[{title:apn.CExe.GL({ko:'[가로]-하단', en:'[Horizontal]-Bottom'}), value:'B'},{title:apn.CExe.GL({ko:'[가로]-상단', en:'[Horizontal]-Top'}), value:'T'},{title:apn.CExe.GL({ko:'[세로]-좌측', en:'[Vertical]-Left'}), value:'L'},{title:apn.CExe.GL({ko:'[세로]-우측', en:'[Vertical]-Right'}), value:'R'}]
			,value:cfg, key:'pos', join:true}
		);

		eduLib.edtInputAdd(apd, tagDlg, {type:'space'});
		eduLib.edtInputAdd(apd, tagDlg, {type:'table', title:apn.CExe.GL({ko:'이미지',en:'Sprites'}), value:cfg.ptn
			,options:{th:[apn.CExe.GL({ko:'이미지 파일',en:'Image file'}), apn.CExe.GL({ko:'기준위치로부터 좌표',en:'Offset position'})+'[px]', apn.CExe.GL({ko:'속도[기준속도 배수]', en:'Speed[Times of base speed]'}), apn.CExe.GL({ko:'방향',en:'Direction'})], add:true, remove:true, order:true}, td:[{type:'image',key:'i'}, {type:'number',key:'p'}, {type:'number',key:'spd',min:0, step:0.1}, {type:'select',key:'d',options:[{title:apn.CExe.GL({ko:'순방향',en:'Forward'}), value:'RB'},{title:apn.CExe.GL({ko:'역방향',en:'Backward'}), value:'LT'}]}]
			,join:true
		});
	}
}

xa.edtOnDraw = function(apd, objID, ctx, ox, oy, w, h, /*Boolean*/editMode)
{
	var obj = apd.getObjectByID(objID);
	var cfg = obj.data.properties.attrs.cfg;

	if (obj.apdPreloaded){
		//	_drawPtn() 참조
		ctx.save();
		ctx.beginPath();
		ctx.rect(ox, oy, w, h);
		ctx.clip();

		//	배경색이 있으면 표시함. 테두리는 그냥 무시함.
		if (obj.style.fillStyle){
			ctx.fillStyle = obj.style.fillStyle;
			ctx.fill();
		}

		for(var i = 0; i < cfg.ptn.length; i ++){
			if (obj.apdPreloaded[i] && obj.apdPreloaded[i].image){
				var img = obj.apdPreloaded[i].image;
				var x, y;

				if (cfg.pos == 'B'){
					y = h - img.height - bx.$checkNaN(parseInt(cfg.ptn[i].p));
				}
				else if (cfg.pos == 'T'){
					y = bx.$checkNaN(parseInt(cfg.ptn[i].p));
				}
				else if (cfg.pos == 'R'){
					x = w - img.width - bx.$checkNaN(parseInt(cfg.ptn[i].p));
				}
				else if (cfg.pos == 'L'){
					x = bx.$checkNaN(parseInt(cfg.ptn[i].p));
				}

				if (cfg.pos == 'B' || cfg.pos == 'T'){ // 가로
					for(var tx = 0; tx < w; tx += img.width){
						ctx.drawImage(img, tx+ox, y+oy, img.width, img.height);
					}
				}
				else{
					for(var ty = 0; ty < h; ty += img.height){
						ctx.drawImage(img, x+ox, ty+oy, img.width, img.height);
					}
				}
			}
		}
		ctx.restore();
	}
}

xa.edtOnPreloadAsset = function(apd, oId, onLoad)
{
	var cfg = apd.wgtGetProperty(oId, 'cfg');

	if (apd.getObjectByID(oId) && apd.getObjectByID(oId).apdPreloaded){
		var imgs = apd.getObjectByID(oId).apdPreloaded;
	}
	else{
		var imgs = {};
	}

	for(var i = 0; i < cfg.ptn.length; i ++){
		if (cfg.ptn[i].i.mediaID) imgs[i] = {url:apd.mediaURL(cfg.ptn[i].i.mediaID)};
	}

	function onLoadImgs(cntAll, cntSucc, cntErr)
	{
		if (cntAll == cntSucc){
			if (apd.getObjectByID(oId)){
				apd.getObjectByID(oId).apdPreloaded = imgs;
			}
			onLoad(true);
		}
		else{
			onLoad(false);
		}
	}
	new apn.CRscLoader().load(apd.getData(), imgs, onLoadImgs);
}

xa.edtOnCheckEdited = function(apd, oId)/*Boolean*/
{
	var cfg = apd.wgtGetProperty(oId, 'cfg');

	for(var i = 0; i < cfg.ptn.length; i ++){
		if (cfg.ptn[i].i.mediaID) return true;
	}

	return false;
}

uxWgtSceneScrl = xa;

uxWgtSceneScrlLOOP = function(apx, tag)
{
	this.apx = apx;
	this.tag = tag;
}

/*	value:
		{
			id: 개발자가 할당한 제어 ID
			object:WidgetID|Image, from:, to:, type:'image'
			x|y:
		}
*/
uxWgtSceneScrlLOOP.prototype.attach = function(value)
{
	var tag = this.tag;
	var apx = this.apx;
	var oId = this.tag.apnOID;

	if (!(value && value.object && (value.type == 'image' || apx.wgtTag(value.object)))){
		this.apx.log(oId, 'Invalid parameter for attachWidget. Parameter='+JSON.stringify(value));
		return;
	}

	tag.ctx._uWgts = tag.ctx._uWgts || [];

	//	동일한 ID가 있으면 교체함
	if (value.id){
		this.detach(value.id);
	}

	//	from, to 값 계산 - 방향과 크기를 고려해야 계산이 가능함
	var wgtW = apx.wgtW(oId);
	var wgtH = apx.wgtH(oId);
	var dist = tag.ctx._distPxLastFire || 0;
	var sclDir = (tag.ctx.cfg.pos == 'B' || tag.ctx.cfg.pos == 'T') ? 'x' : 'y'; // 스크롤 방향
	
	/*	위치는 Distance를 기준으로 계산하며, Distance가 진입부분을 통과하는 시점으로 계산함
	*/
	if (sclDir == 'x'){
		if (value.from === undefined){
			value.from = dist + wgtW;
		}
		if (value.to === undefined){
			value.to = value.from + wgtW + apx.wgtW(value.object);
		}

		value._offset = wgtW;
		value._area = apx.wgtX(oId);
	}
	else{ // y
		if (value.from === undefined){
			value.from = dist + wgtH;
		}
		if (value.to === undefined){
			value.to = value.from + wgtH + apx.wgtH(value.object);
		}

		value._offset = wgtH; // 진입 지점 계산을 위한 값
		value._objSize = apx.wgtH(value.object); // 물체의 크기
		value._area = apx.wgtY(oId); // Scroll area 시작 위치
	}

	value._dir = sclDir;
	
	tag.ctx._uWgts.push(value);
}

/*	Detach함
	Return
		삭제되면 true Return;
*/
uxWgtSceneScrlLOOP.prototype.detach = function(id, /*Boolean*/_all)/*Boolean*/
{
	var buf, ret = false;

	for(var i = 0; i < this.tag.ctx._uWgts.length; i ++){
		buf = this.tag.ctx._uWgts[i];
		
		if (_all || (buf.id && buf.id == id)){
			this.tag.ctx._uWgts.splice(i, 1);
			i --;
			
			this.fire(this.tag.ctx._distPxLastFire, 'detached', buf);
			ret = true;
		}
	}

	return ret;
}

/*	distance를 넘어가면 id에 해당하는 trigger Event를 발생시킴
	distance === undefined,이면 현재 위치를 지정함
*/
uxWgtSceneScrlLOOP.prototype.trigger = function(id, distance)
{
	if (distance === undefined){
		distance = this.tag.ctx._distPxLastFire || 0;
	}

	this.tag.ctx._uTrgs = this.tag.ctx._uTrgs || {};
	this.tag.ctx._uTrgs[id] = distance;
}

uxWgtSceneScrlLOOP.prototype.loop = function(fn)
{
	this._loop = fn;
}

uxWgtSceneScrlLOOP.prototype.fire = function(dist, ev, evData)
{
	if (this._loop) this._loop(this, dist, ev, evData);
}
///////////////////////////////////////////////////////////////////////////////
// ux.wgt.inputText
/*
	편집에서 입력된 Text는 Placeholder로 사용됨

	[State]
		normal
		readonly
	[Scripting]
		run(): focus
			Input이 Focus를 받음. Value는 무과함
			wgt.setData(i, 'focus', true);

		setData/getData()
			selection
				Text의 selection 영역을 가져오거나 지정함
					{start:Number, end:Number}
				의 형태이며,
				값은 Input.selectionStart/selectionEnd와 동일한 기능의 값임
			save: Boolean
				Local/Temp Storage에 값을 저장할지 여부
				저장된 값을 Clear하려면
				false를 Set함
				%%INFO Local Storage에 저장하므로 Cache 지우기 전까지 유효하며. Aspen Reader App은 실행 중까지만 유효할 수 있다.
					
	[Event]
		inputChange
		inputFocus
		inputBlur

*/
var xa = {}

xa.styleMap = {
	title:true
	,visibility:true
	,strokeStyle:true, lineWidth:true, lineDash:true
	,fillStyle:true
	,font:true, fontSize:true, fontStyle:true, fontItalic:true, fontBold:true, textMultiLine: true, fontUnderlined:true
	,text:true,	textAlign:true, textWordWrap:true, ltrSp:true, lnSp:true
	,fontStrokeStyle:true, fontStrokeWidth:true
	,alpha:true
	,angle:true
	,csr:true
}
xa.APX_NO_POINTER_EV = true;
xa.apxInputSave = true;

xa.editor = {};
xa.editor.states = {normal:'Normal', readonly:'Readonly'};
xa.editor.properties = {
	ty:{title:'Type', input:[{title:'Text',value:''},{title:'Number',value:'number'}]}
	,mxl:{title:'MaxLength', input:'', type:'number'}
	,sly:{title:'ScrollBarY', input:[{title:'Auto',value:''},{title:'Always',value:'s'},{title:'Hidden',value:'h'}]}
	,txtI:{title:apn.CExe.GL({ko:'들여쓰기',en:'TextIndent'}), input:'', type:'number'}
	,ime:{title:'IME', input:[{title:'Active',value:'T'},{title:'Inactive',value:'F'},{title:'Inherit',value:''},{title:'Auto',value:'A'}]}
}

/*	%%INFO 모두 위젯 생성할때 WidgetLib에서 넣어서 호출하는 값임
	txtI: Text Indent
	ty
	mx1
	sly
	ime
*/
xa.properties = {};
xa.properties.state = 'normal';
xa.properties.attrs = {
	ime:''
};

xa.scriptInfo = {
	wgtData:{selection:{help:{ko:'{start:0-based Number,end:1-based Number}\n지정된 영역의 텍스트를 선택합니다.',en:'{start:0-based Number,end:1-based Number}\nSelection area of text'}}}
	,wgtRun:{focus:{param:"true", help:{ko:'포커스 상태로 지정합니다. (iOS Safari에서는 Wait에 의한 Focus동작이 보안 제약으로 동작하지 않을 수 있습니다)',en:'Set focus on this input. (Focus-with-wait may not work in iOS Safari by security restriction)'}}}
}

xa.createAsCanvasObject = apn.widgets['apn.wgt.rect'].createAsCanvasObject;
xa.onEdit = apn.widgets['apn.wgt.rect'].onEdit;

xa.exeSetState = function(apx, tag, /*String*/state)
{
	if (state == 'readonly'){
		tag.apxInputTag.readOnly = true;
		tag.apxInputTag.placeholder = '';
	}
	else{
		tag.apxInputTag.readOnly = false;
		tag.apxInputTag.placeholder = apx.wgtGetProperty(tag.apnOID, 'apxText') || '';
	}
}

xa.getIME = function(prj, uAttr)/*String*/
{
	//	IME 사용 여부 - Inherit은 문서에 지정된 값을 Inherit해서 사용한다는 뜻임
	var cssIME = '';

	if (uAttr && uAttr.ime == 'T'){
		cssIME = 'ime-mode:active;'
	}
	else if (uAttr && uAttr.ime == 'F'){
		cssIME = 'ime-mode:inactive;'
	}
	else if (uAttr && uAttr.ime == 'A'){
		//NOOP
	}
	else{ //Inherit
		var exeProp = apn.Project.getLayout(prj).property.CExe;

		if (exeProp && exeProp.lng && exeProp.lng.ime == 'N'){
			//NOOP
		}
		else if (exeProp && exeProp.lng && exeProp.lng.ime == 'A'){
			cssIME = 'ime-mode:inactive;'
		}
		else{
			cssIME = 'ime-mode:active;' // 한글 등을 위한 것으로 IE에서만 동작함
		}
	}

	return cssIME;
}

xa.exeCreateTag = function(viewer, canvas, objData, zx, zy, oId)/*Element*/
{
	var tag;
	var oStyles = objData.create.data.styles;
	var oAttrs = objData.create.data.properties ? objData.create.data.properties.attrs : undefined;

	var cssIME = this.getIME(viewer.project, oAttrs);
	
	//	'input', 'textarea' 2가지 TAG를 검색하므로 ''로 검색함.
	if (viewer.o.standAlone && oId && (tag = apn.CExe.getElementByAttr('', 'data-apx-id', oId))){
		tag.apnCur = {};
		tag.apnCur.apxCreatedFromTag = true;
	}
	else{
		//	%%INFO input은 border:none을 명시적으로 줘야함. 이 값은 공용 함수에서 처리하지 않았으므로 각 INPUT 위젯이 처리해야 함
		var css = cssIME+'position:absolute;box-sizing:border-box;margin:0px;padding:0px;outline:none;background-color:transparent;border:none;';

		if (oStyles && !oStyles.textMultiLine){
			var type = oAttrs&&oAttrs.ty ? oAttrs.ty:'text';

			tag = document.body.$TAG('input', {type:type, autocomplete:'off', autocapitalize:'off', autocorrect:'off', style:css});
		}
		else{
			//	Scroll
			var scrollY = 'auto';

			if (oAttrs && oAttrs.sly == 's'){
				scrollY = 'scroll';
			}
			else if (oAttrs && oAttrs.sly == 'h'){
				scrollY = 'hidden';
			}

			//	Text Indent
			if (oAttrs && oAttrs.txtI !== undefined){
				var txtIdt = bx.$checkNaN(parseFloat(oAttrs.txtI));

				if (txtIdt&&txtIdt>0) css += 'text-indent:'+txtIdt+'em;';
			}
			
			tag = document.body.$TAG('textarea', {autocapitalize:'off', autocorrect:'off', style:css+'overflow-y:'+scrollY+';overflow-x:hidden;resize:none;outline:none;border:none;'});
			tag.$A({'class':'apnCExeScroll'});
		}
		tag.apnCur = {};

		//	Tab Order Disable
		var propCExe = apn.Project.getLayout(viewer.project).property.CExe;

		if (propCExe && propCExe.inputDisableTabOrder == 'Y'){
			tag.setAttribute('tabindex', '-1');
		}
	}
	tag.apxInputTag = tag;

	if (tag.tagName.toLowerCase() == 'input' && bx.HCL.DV.isIOS() && viewer.getFonts){
		var fontList = viewer.getFonts();
		var fontCur = apn.Project.resolveStyle(viewer.project, 'font', oStyles.font);

		for(var i = 0; i < fontList.length; i ++){
			if (fontList[i].face == fontCur && fontList[i].xInIOS){
				tag._fontIOSproblem = fontList[i].xInIOS;
			}
		}
	}

	/*	iOS Input Font 문제 유형은 다음과 같다.
		B = Font의 높이가 크게 인식되는 경우
			DIV로 싸고 Placeholder를 표시하지 않음
		A = 하단이 잘리는 경우
			border-bottom: solid 1px transparent
	*/
	//	IOS의 vertical 정렬 문제로 DIV TAG로 싸줘야 함.
	if (tag._fontIOSproblem == 'B'){
		var input = tag;
		
		delete input.apnCur;

		tag = document.body.$TAG('div', {style:'position:absolute;box-sizing:border-box;overflow:hidden;padding:0;margin:0;'});
		tag.appendChild(input);
		input.style.left = '0px';
		input.style.top = '0px';
		input.style.width = '100%';
		input.style.border = 'none';
		input.style.background = 'transparent';
		input.style.color = 'inherit';
		input.style.letterSpacing = 'inherit';
		input.style.textDecoration = 'inherit';
		input.style.textAlign = 'inherit';
		input.style.font = 'inherit';
		input.style.fontSize = 'inherit';
		input.style.fontWeight = 'inherit';
		input.style.display = 'block';

		tag._fontIOSproblem = input._fontIOSproblem;
		tag.apxInputTag = input;
		tag.apnCur = {};
	}

	if (oAttrs && oAttrs.mxl){
		var max = bx.$checkNaN(parseInt(oAttrs.mxl));

		if (max){
			tag.apxInputTag.setAttribute('maxlength', max);

			//	Number이면 'max'값을 지정해 줘야 크롬의 경우 동작함
			if (oAttrs.ty == 'number'){
				tag.apxInputTag.setAttribute('max', Math.pow(10,max)-1);
			}
		}
	}

	var _this = this;

	/*	%%INFO
			iOS의 경우, Font metric이 높아서 세로 공간이 긴 경우, lineHeight에 따라서 수직 중간 정렬이 동작하지 않는 문제가 있어서, top을 직접 Set함
			그런데, 사전에 value가 존재하는 경우도 있는데, 이것을 감지할 수 없으므로 외부에서 호출하도록 함수를 분리/제공함
			또한, 이 동작은 invisible 상태에서는 동작하지 않으므로, Delayed 처리도 필요함
	*/
	tag.apxInputTag._reconstruct = function()
	{
		if (tag._fontIOSproblem == 'B'){
			if (canvas.wgtIsVisible(oId)){
				//	비어 있으면, 측정용 Text로 미리 위치를 맞춰 놓음
				var value = this.value;

				if (!value) this.value = 'AgHjkLlpqQsTyZ|!'; // 그냥 높이 계산용임.

				this.style.height = 'auto';
				this.style.top = (((tag.clientHeight) - this.offsetHeight)/2)+'px';

				/*	2018/08
					iOS Input의 경우, Placeholder를 표시하는 Logic과 Input을 표시하는 Logic이 별도로 구현된 것으로 생각됨
					따라서, 위치를 보정해도 Placeholder 위치는 다르므로 제거함
					
					대안으로 Placeholder를 tag에 구현하는 방법도 있을 수 있음
				*/
				if (this.offsetHeight > tag.clientHeight && this.getAttribute('placeholder')){
					this.setAttribute('placeholder', '');
				}

				/*	top:50%
					translateY(-50%)
					도 가능한 방안이나 이미 이렇게 구현하였으므로 그대로 사용함
				*/

				if (!value) this.value = value;

				delete this._dlydRct;
			}
			else{ // Delayed
				this._dlydRct = true;
			}
		}
	}

	bx.Event.add(tag.apxInputTag, 'input', function()
	{
		/*	CExe에서 Hit Tag를 찾는 절차에서 발생한 Event이므로 무시해야 함
			Focus변경에 의해서 발생하는 input event도 무시함.
		*/	
		if (bx.HCL.DV.isIE() && bx.HCL.DV.isIE() < 10){
			if (this._valueBK !== undefined && this._valueBK == this.value) return;
			if (this._valueBK === undefined && !this.value) return;
			
			this._valueBK = this.value;
		}

		if (tag.apnOID){
			_this._localSave(canvas, tag);

			canvas.fireEvent('inputChange', undefined, tag.apnOID, /*always*/true);
		}
	}, false);

	bx.Event.add(tag.apxInputTag, 'focus', function()
	{
		//	CExe에서 Hit Tag를 찾는 절차에서 발생한 Event이므로 무시해야 함.
		if (tag.apxIeIgnoreFocusEvent) return;

		this._reconstruct();

		if (tag.apnOID){
			canvas.fireEvent('inputFocus', undefined, tag.apnOID, /*always*/true);
		}
	}, false);

	bx.Event.add(tag.apxInputTag, 'blur', function()
	{
		if (tag.apxIeIgnoreFocusEvent) return;

		if (tag.apnOID){
			canvas.fireEvent('inputBlur', undefined, tag.apnOID, /*always*/true);
		}
	}, false);

	tag.apxInputTag.apxInputTag.$CSS('textShadow', 'inherit');

	if (oStyles && !oStyles.textMultiLine){
		//	크기가 변환할때 lineHeight를 Set하여 수직 정렬을 유지하기 위한 것임
		tag.tagOnPostResize = function(apx, tag)
		{
			tag.style.lineHeight = (parseInt(tag.style.height)-(parseInt(tag.style.borderWidth)||0)*2)+'px';
		}
	}
	else{
		tag.apnOnSetText = function(tag, text, /*Enum|undefined*/Valign, /*Enum|undefined*/align, /*Boolean|undefined*/multiLine,  /*Boolean|undefined*/wordWrap, /*String|undefined*/font, ltrSp, lnSp, /*Number*/fontSize)
		{
			if (Valign) tag._initValign = Valign;
			if (align) tag._initAlign = align;
			if (multiLine !== undefined) tag._initMultiLine = multiLine;
			if (wordWrap !== undefined) tag._initWordWrap = wordWrap;
			if (font !== undefined) tag._initFont = font;
			if (fontSize) tag._initFontSize = fontSize;
			if (ltrSp) tag._initLtrSp = ltrSp;
			if (lnSp) tag._initLnSp = lnSp;

			font = font || tag._initFont;
			lnSp = lnSp || tag._initLnSp;
			ltrSp = ltrSp || tag._initLtrSp;

			// FontSize가 바뀔때 lineHeight 다시 처리해야 함
			if (fontSize){
				var fontHratio = 1.2;//%%DEFAULT

				if (apn.fonts && apn.fonts[font] && apn.fonts[font].height !== undefined) fontHratio = apn.fonts[font].height;

				var lineH = fontSize*fontHratio;

				if (lnSp){
					lineH += lnSp;
				}
				tag.style.lineHeight = lineH+'px';

				if (ltrSp){
					tag.style.letterSpacing = ltrSp+'px';
				}
				else{
					tag.style.letterSpacing = 'normal';
				}
			}
		}
	}
	return tag;
}

xa.exeRenderTag = function(viewer, canvas, tag, objData, zx, zy)/*Element*/
{
	if (tag.apnCur.apxCreatedFromTag && zx == 1 && zy == 1){
		apn.IWidget.exeRenderTagVhtml.call(this, viewer, canvas, tag, objData, zx, zy);
	}
	else{
		var styles = apn.IWidget.exeRenderTagV1.call(this, viewer, canvas, tag, objData, zx, zy);

		/*	SingleLine
			letterSpacing과 lineHeight을 Set함.
			lineHeight는 위젯 크기가 바뀔 때도 tagOnPostResize()에서 다시 Set함
		*/
		if (styles && !styles.textMultiLine){
			if (styles.ltrSp){
				tag.style.letterSpacing = parseFloat(styles.ltrSp)*zx+'px';
			}
			else{
				tag.style.letterSpacing = 'normal';
			}
			tag.style.lineHeight = (parseInt(tag.style.height)-(parseInt(tag.style.borderWidth)||0)*2)+'px';
		}
	}

	if (tag._fontIOSproblem == 'A'){
		tag.apxInputTag.style.borderBottom = 'solid 1px transparent';
	}
	
	return tag;
}

xa.exeOnLoad = function(apx, oId)
{
	var tag = apx.wgtTag(oId);

	//	Load from local data. Be fired at exeOnStart
	this._localLoad(apx, tag);

	var _this = this;

	// run:focus
	function onFocus(changeWgtId, value)
	{
		if (changeWgtId == oId){
			tag.apxInputTag.focus();
		}
	}
	apx.wgtListenProperty(oId, 'focus', onFocus);

	// setData:selection
	function onSelection(changeWgtId, value)
	{
		if (changeWgtId == oId && value){
			tag.apxInputTag.setSelectionRange(value.start, value.end);
		}
	}
	apx.wgtListenProperty(oId, 'selection', onSelection);

	// setData:save
	function onSetSave(changeWgtId, value)
	{
		if (changeWgtId == oId){
			if (value){
				_this._localSave(apx, tag);
			}
			else{
				_this._localClear(apx, tag);
			}
		}
	}
	apx.wgtListenProperty(oId, 'save', onSetSave);

	//	압축 대상 Font가 지정되면 경고 메시지를 출력함
	if (apn.dbUI && apn.dbUI.system && apn.dbUI.system.pubFontCompress){
		var fonts = apn.Project.publishListFontFile(apx.project, undefined, /*_includeDefault*/true);

		for(var i = 0; i < fonts.length; i ++){
			if (fonts[i].compress && fonts[i].face == apx.wgtGetProperty(oId, 'apxFont')){
				apx.log(oId, "Using compressed font '"+fonts[i].title+"' for input widget may cause input problem.");
				break;
			}
		}
	}
}

xa.exeOnVisibilityChange = function(apx, oId, /*Boolean*/isVisible)
{
	var tag = apx.wgtTag(oId);

	if (isVisible && tag.apxInputTag._dlydRct){
		tag.apxInputTag._reconstruct();
	}
}

xa.exeOnStart = function(apx, oId)
{
	var tag = apx.wgtTag(oId);

	tag.apxInputTag._reconstruct();

	apx.fireEvent('inputSet', undefined, oId, /*always*/true);
}

xa.exeInputGet = function(apx, tag)/*Value*/
{
	return tag.apxInputTag.value;
}

xa.exeInputSet = function(apx, tag, value, _noSaveAndFire)/*Value*/
{
	var prv = tag.apxInputTag.value;

	tag.apxInputTag.value = value;

	if (prv != value){
		if (bx.HCL.DV.isIE() && bx.HCL.DV.isIE() < 10){
			tag.apxInputTag._valueBK = value;
		}

		if (!_noSaveAndFire){
			this._localSave(apx, tag);
			apx.fireEvent('inputSet', undefined, tag.apnOID, /*always*/true);
		}
		tag.apxInputTag._reconstruct();
	}
	
	return value;
}

/*	'selection'의 경우, 미리 값을 저장하면 시차가 발생하는 브라우저가 있어서
	항상 Live값을 읽도록 이 함수를 구현함
*/
xa.exePropGet = function(apx, oId, key, /*Boolean|undefined*/check)
{
	if (check){
		if (key == 'selection') return true;
	}
	else{
		if (key == 'selection'){
			var tag;

			if ((tag = apx.wgtTag(oId)).apxInputTag){
				return {start:tag.apxInputTag.selectionStart, end:tag.apxInputTag.selectionEnd};
			}
			else{
				return {start:0, end:0};
			}
		}
	}
}

xa._localSave = function(apx, tag)
{
	if (apx.wgtGetProperty(tag.apnOID, 'save')){
		if (apx.project && apx.project.property.id){
			var key = '$APX$INP_'+apx.project.property.id+':'+tag.apnOID;

			apx.utlLocalSave(key, this.exeInputGet(apx, tag));
		}
	}
}

xa._localLoad = function(apx, tag)/*Boolean*/
{
	if (apx.project && apx.project.property.id){
		var key = '$APX$INP_'+apx.project.property.id+':'+tag.apnOID;
		var value;

		if ((value = apx.utlLocalLoad(key)) !== null){
			this.exeInputSet(apx, tag, value, /*noSaveAndNoti*/true);
			return true;
		}
	}
	return false;
}

xa._localClear = function(apx, tag)
{
	if (apx.project && apx.project.property.id){
		var key = '$APX$INP_'+apx.project.property.id+':'+tag.apnOID;

		if (apn.clearTempFile) apn.clearTempFile(key);
	}
}

xa.edtOnBuildEvent = function(prj, oId, pageID, ret)
{
	ret.inputChange = {value:'inputChange', title:apn.P.eventTitle.inputChange};
	ret.inputSet = {value:'inputSet', title:apn.P.eventTitle.inputSet};
	ret.inputFocus = {value:'inputFocus', title:apn.P.eventTitle.inputFocus};
	ret.inputBlur = {value:'inputBlur', title:apn.P.eventTitle.inputBlur};
}

xa.pubOnGetHTML = function(prj, pId, oId, opts)/*String*/
{
	var oAttrs = prj.pages[pId].objects[oId].create.data.properties ? prj.pages[pId].objects[oId].create.data.properties.attrs : undefined;

	var ret = apn.IWidget.htmlRender(this, prj, pId, oId);
	var html = '', attr = '', cls = '';
	var tagName;

	if (!ret.style.textMultiLine){
		tagName = 'input';
		ret.css += 'outline:none;margin:0px;padding:0px;';
		attr += ' type="'+(oAttrs&&oAttrs.ty ? oAttrs.ty:'text')+'"';
		attr += ' autocomplete="off"'; // autocapitalize="off" autocorrect="off"'; 비표준이라 XHTML에는 추가하지 않음
	}
	else{
		var scrollY = 'auto';

		if (oAttrs && oAttrs.sly == 's'){
			scrollY = 'scroll';
		}
		else if (oAttrs && oAttrs.sly == 'h'){
			scrollY = 'hidden';
		}

		tagName = 'textarea';
		ret.css += 'overflow-y:'+scrollY+';overflow-x:hidden;resize:none;outline:none;margin:0px;padding:0px;';
		cls += ' apnCExeScroll';
		//attr += ' autocapitalize="off" autocorrect="off"'; 비표준이라 XHTML에는 추가하지 않음

		//	Text Indent
		if (oAttrs && oAttrs.txtI !== undefined){
			var txtIdt = bx.$checkNaN(parseFloat(oAttrs.txtI));

			if (txtIdt&&txtIdt>0) ret.css += 'text-indent:'+txtIdt+'em;';
		}
	}

	//	Text 관련 Style
	ret.css += apn.IWidget.htmlRenderText(this, prj, pId, oId, ret);

	//	htmlRender()가 'transparent'를 지정하지 않으므로 INPUT에서는 지정함. 지정해야 표시가 됨.
	ret.css += 'background-color:'+(ret.style.fillStyle||'transparent')+';';

	//	border:none을 명시적으로 줘야함.
	if (!(ret.style.lineWidth && ret.style.strokeStyle)){
		ret.css += 'border:none;';
	}

	attr += ' placeholder="'+(ret.style.text||'')+'"';

	if (!(opts&&opts.noId)){
		attr += ' data-apx-id="'+oId+'"';
	}

	//	IME 사용 여부
	ret.css += this.getIME(prj, oAttrs);

	//	MatLength
	if (oAttrs && oAttrs.mxl){
		var max = bx.$checkNaN(parseInt(oAttrs.mxl));

		if (max){
			attr += ' maxlength="'+max+'"';

			//	Number이면 'max'값을 지정해 줘야 크롬의 경우 동작함
			if (oAttrs.ty == 'number'){
				attr += ' max="'+(Math.pow(10,max)-1)+'"';
			}
		}
	}

	//	실행기에서 Attr 추가. attr0, 즉 firstChild 부분만 처리하면 됨..
	var clsExe = apn.Project.getExeModule(prj);
	var moreDOM;

	if (clsExe.IStub_pubProcWgtAttr && (moreDOM = clsExe.IStub_pubProcWgtAttr(prj, pId, oId))){
		if (moreDOM.attr){
			for(var i in moreDOM.attr){
				if (moreDOM.attr[i] !== undefined){
					attr += ' '+i+'="'+moreDOM.attr[i]+'"';
				}
			}
		}
	}

	html += '<'+tagName;
	html += ' style="'+ret.css+'"';
	html += ' class="apxWgt1'+cls+'"';
	html += attr;
	html += '></'+tagName+'>';

	return html;
}

uxWgtInputText = xa;
