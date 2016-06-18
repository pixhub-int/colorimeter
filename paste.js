var Paste = (function () {

	// создание ловушки для вставляемых данных
	var createHiddenEditable = function () {
		var elem = document.createElement('div');

		elem.setAttribute('contenteditable', true);
		elem.setAttribute('aria-hidden', true);
		elem.setAttribute('tabindex', -1);
		elem.style.cssText = ' \
			width: 1px; \
			height: 1px; \
			position: fixed; \
			left: -100px; \
			overflow: hidden;';

		return elem;
	};

	var isNodeList = function (nodes) {
		return NodeList.prototype.isPrototypeOf(nodes);
	};

	// генерация событий
	var trigger = function (elem, name, data) {
		var event;
		var HTMLEvents = ['change'];
		
		if (HTMLEvents.indexOf[name] > -1) {
			event = document.createEvent('HTMLEvents');
			event.initEvent(name, true, false);
		}
		else {
			if (window.CustomEvent) {
				event = new CustomEvent(name, { detail: data });
			}
			else {
				event = document.createEvent('CustomEvent');
				event.initCustomEvent(name, true, true, data);
			};
		};

		elem.dispatchEvent(event);
	};

	// конвертация закодированного изображения в объект
	var dataURItoBlob = function (dataURI) {
		var bytes = atob(dataURI.split(',')[1]);
		var mime = dataURI.split(',')[0].split(':')[1].split(';')[0];
		var len = bytes.length;
		var arr = new Uint8Array(len);
		
		for (var i = 0; i < len; i++ ) {
			arr[i] = bytes.charCodeAt(i);
		};

		return new Blob([arr], { type: mime });
	};

	Paste.prototype._target = null;
	Paste.prototype._container = null;

	Paste.init = function (elems) {
		if (typeof elems === 'string') {
			elems = document.querySelectorAll(elems);
		}
		else if (!elems.isArray && !isNodeList(elems)) {
			var tmp = [];

			tmp.push(elems);
			elems = tmp;
		};

		[].forEach.call(elems, function (elem) {
			if (elem.getAttribute('data-paste-inited')) { return; };
			
			if (elem.tagName === 'TEXTAREA') {
				Paste.initTextarea(elem);
			}
			else if (!!elem.hasAttribute('contenteditable')) {
				Paste.initContenteditable(elem);
			}
			else {
				Paste.initNonInputable(elem);
			};
			
			elem.setAttribute('data-paste-inited', true);
		});

		return elems;
	};

	Paste.initContenteditable = function (elem) {
		var paste = new Paste(elem, elem);

		elem.addEventListener('focus', function () {
			elem.classList.add('pastable-focus');
		});
		elem.addEventListener('focus', function () {
			elem.classList.remove('pastable-focus');
		});
	};

	Paste.initNonInputable = function (elem) {
		var paste = new Paste(elem.appendChild(createHiddenEditable()), elem);

		elem.addEventListener('click', function () {
			paste._container.focus();
		});
		elem.addEventListener('focus', function () {
			this.classList.add('pastable-focus');
		});
		elem.addEventListener('blur', function () {
			this.classList.remove('pastable-focus');
		});
	};

	Paste.initTextarea = function (textarea) {
		if (!navigator.userAgent.toLowerCase().match(/firefox|trident|edge/)) {
			return this.initContenteditable(textarea);
		};

		var paste = new Paste(textarea.parentNode.insertBefore(createHiddenEditable(), textarea), textarea);
		var ctlDown = false;

		textarea.addEventListener('keyup', function (ev) {
			var ref;
			
			if ((ref = ev.keyCode) === 17 || ref === 224) {
				ctlDown = false;
			}
			return null;
		});
		textarea.addEventListener('keydown', function (ev) {
			var ref;
			
			if ((ref = ev.keyCode) === 17 || ref === 224) {
				ctlDown = true;
			}
			if ((ev.ctrlKey != null) && (ev.metaKey != null)) {
				ctlDown = ev.ctrlKey || ev.metaKey;
			}
			if (ctlDown && ev.keyCode === 86) {
				paste._textarea_focus_stolen = true;
				paste._container.focus();
				paste._paste_event_fired = false;
				setTimeout((function (_this) {
					return function () {
						if (!paste._paste_event_fired) {
							textarea.focus();
							return paste._textarea_focus_stolen = false;
						}
					};
				})(this), 1);
			}
			return null;
		});
		textarea.addEventListener('focus', function () {
			if (!paste._textarea_focus_stolen) {
				return textarea.classList.add('pastable-focus');
			}
		});
		textarea.addEventListener('blur', function () {
			if (!paste._textarea_focus_stolen) {
				return textarea.classList.remove('pastable-focus');
			}
		});
		paste._target.addEventListener('_pasteCheckContainerDone', function () {
			textarea.focus();
			return paste._textarea_focus_stolen = false;
		});
		return paste._target.addEventListener('pasteText', function (ev) {
			var curStart = textarea.selectionStart;
			var curEnd = textarea.selectionEnd;
			var content = textarea.value;

			textarea.value = "" + content.slice(0, curStart) + ev.detail.text + content.slice(curEnd);
			textarea.setSelectionRange(curStart + ev.detail.text.length, curStart + ev.detail.text.length);
			
			return trigger(textarea, 'change');
		});
	};

	function Paste(_container, _target) {
		this._container = _container;
		this._target = _target;
		this._target.classList.add('pastable');

		this._container.addEventListener('paste', (function (_this) {
			return function (ev) {
				var clipboardData, ref, ref2, text;

				if (((ref = ev) != null ? ref.clipboardData : void 0) != null) {
					clipboardData = ev.clipboardData;
					if (clipboardData.items) {

						// Хром
						var ref1 = clipboardData.items;
						
						for (var i = 0, len = ref1.length, item; i < len; i++) {
							item = ref1[i];
							
							if (item.type.match(/^image\//)) {
								return _this._handleImage(item.getAsFile());
							}
							else if (item.type === 'text/plain') {
								item.getAsString(function (string) {
									_this._handleText(string);
								});
							}
						}
					}
					
					// ФФ и Сафари
					else {
						if (-1 !== Array.prototype.indexOf.call(clipboardData.types, 'text/plain')) {
							text = clipboardData.getData('Text');
							setTimeout(function() {
								_this._handleText(text);
							}, 1);
						}
						_this._checkImagesInContainer(function (src) {
							if (src.match(/data:/)) {
								return _this._handleImage(dataURItoBlob(src));
							}
							
							// если получено не закодированное
							// значит, скорее всего, ссылка
							else {
								return;
							};
						});
					}
				}

				// ИЕ
				if (clipboardData = window.clipboardData) {
					if ((ref2 = (text = clipboardData.getData('Text'))) != null ? ref2.length : void 0) {
						setTimeout(function() {
							_this._handleText(string);
							return _this._target.trigger('_pasteCheckContainerDone');
						}, 1);
					}
					else {
						var ref3 = clipboardData.files;
						
						for (var j = 0, len1 = ref3.length, file; j < len1; j++) {
							file = ref3[j];
							_this._handleImage(file);
						};
						
						_this._checkImagesInContainer(function(src) {});
					}
				};
				
				return null;
			};
		})(this));
	}

	Paste.prototype._handleImage = function (blob) {
		trigger(this._target, 'pasteImage', {
			blob: blob
		})
	};

	Paste.prototype._handleText = function (text) {
		trigger(this._target, 'pasteText', {
			text: text
		});
	};

	Paste.prototype._checkImagesInContainer = function (cb) {
		var timespan = Math.floor(1000 * Math.random());
		var ref = this._container.querySelectorAll('img');

		for (var i = 0, len = ref.length, img; i < len; i++) {
			img = ref[i];
			img["_paste_marked_" + timespan] = true;
		};

		return setTimeout((function (_this) {
			return function () {
				var ref1 = _this._container.querySelectorAll('img');

				for (var _j = 0, len1 = ref1.length; _j < len1; _j++) {
					img = ref1[_j];
					
					if (!img["_paste_marked_" + timespan]) {
						cb(img.src);
					};
					
					img.remove();
				}

				return trigger(_this._target, '_pasteCheckContainerDone');
			};
		})(this), 1);
	};

	return Paste;

})();
