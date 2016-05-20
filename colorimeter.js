function colorimeter(options) {
	var defaults = {

		// увеличение
		zoom: 4,
		
		// плотность
		density: 4,

		// способ активации фиксации
		requestWay: function (cur) {
			cur.img.addEventListener('click', cur.lockStart);
		},

		// по нажатию на фиксированный холст
		clickCallback: function (cur) {
			alert(cur.pixelColor);
		}
	};
	var cfg = extend({}, defaults, options);

	var img = document.querySelector(cfg.elem);
	
	var cur = {
		zoom: cfg.zoom,
		density: cfg.density,
		x: 0,
		y: 0,
		prev: {
			x: null,
			y: null
		},
		movement: {
			x: 0,
			y: 0
		},
		img: img,
		targetColor: '#000',
		isInited: false,
		isLocked: false,
		pixelColor: 'Подвигайте мышкой перед определением цвета',

		// подготовка инструментов
		initCur: function () {
			cur.getImgOffset();

			if (!cur.isInited) {
				cur.pointerLockInit();
				cur.isInited = true;
				cfg.requestWay(cur);
				window.addEventListener('resize', cur.getImgOffset);
			};
		},
		
		// кеширование положения изображения на экране
		getImgOffset: function () {
			var imgOffsetRect = cur.img.getBoundingClientRect();
			
			cur.imgOffset = {
				top: imgOffsetRect.top + document.body.scrollTop + document.documentElement.scrollTop,
				left: imgOffsetRect.left + document.body.scrollLeft + document.documentElement.scrollLeft
			};
		},

		// подготовка изображения к фиксации
		pointerLockInit: function () {
			cur.img.requestPointerLock = cur.img.requestPointerLock ||
					   cur.img.mozRequestPointerLock ||
					   cur.img.webkitRequestPointerLock;
			
			document.addEventListener('pointerlockchange', lockChangeAlert, false);
			document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
			document.addEventListener('webkitpointerlockchange', lockChangeAlert, false);

			function lockChangeAlert() {
				if (document.pointerLockElement === cur.img ||
					document.mozPointerLockElement === cur.img ||
					document.webkitPointerLockElement === cur.img) {
					cur.onPointerLock();
				} else {
					cur.offPointerLock();
				}
			};
		},

		// активация разрешения фиксации
		lockStart: function (event) {
			cur.getClickOffset(event);
			cur.requestLock(event);
		},

		// получение положения события
		getClickOffset: function (event) {
			var rect = cur.img.getBoundingClientRect();
			var x = event.clientX - rect.left;
			var y = event.clientY - rect.top;
			
			cur.x = x;
			cur.y = y;
			cur.movement.x = cur.zoomPayoff(x);
			cur.movement.y = cur.zoomPayoff(y);
		},

		// по нажатию без фиксации
		requestLock: function (event) {
			cur.img.requestPointerLock();
		},

		// по фиксации мыши
		onPointerLock: function () {
			cur.initCanvas();
			
			if (!cur.isLocked) {
				cur.isLocked = true;
				cur.updateCursor();

				document.addEventListener("mousemove", cur.onMouseMove, false);
				document.addEventListener("click", cur.onLockedClick, false);
			};
		},

		// по освобождению мыши
		offPointerLock: function () {
			cur.isLocked = false;
			cur.destroyCanvas();

			document.removeEventListener("mousemove", cur.onMouseMove, false);
			document.removeEventListener("click", cur.onLockedClick, false);
		},

		// по нажатию фиксированному
		onLockedClick: function () {
			cfg.clickCallback(cur);
		},

		// по движению мыши
		onMouseMove: function (event) {
			cur.getPos(event);
			
			if (cur.x !== cur.prev.x || cur.y !== cur.prev.y) {
				cur.updateCursor();
				cur.prev.x = cur.x;
				cur.prev.y = cur.y;
			};
		},
		
		// подготовка холста
		initCanvas: function () {
			if (cur.canvas) { return; };
			
			if (cur.i && cur.i.src === img.src) {
				cur.createCanvas();
			}
			else {
				cur.i = new Image();
				
				cur.i.onload = cur.createCanvas;
				cur.i.src = img.src;
			};
		},
		
		// создание холста
		createCanvas: function () {
			cur.image = !!this.src ? this : cur.i
			
			cur.getImgOffset();
		
			cur.canvas = document.createElement('canvas');
			cur.ctx = cur.canvas.getContext('2d');
			
			cur.canvas.style.position = 'absolute';
			cur.canvas.style.top = cur.imgOffset.top;
			cur.canvas.style.left = cur.imgOffset.left;
			
			cur.updateCursor();
			
			document.body.appendChild(cur.canvas);
		},
		
		// уничтожение холста
		destroyCanvas: function () {
			if (cur.canvas) {
				cur.canvas.remove();
				cur.canvas = null;
			};
		},

		// отрисовка курсора
		updateCursor: function () {
			if (!cur.canvas) { return; };
			
			var radius = cur.zoom * 12;
			
			cur.setSize();
			cur.setPos();

			// запишем настройки контекста
			cur.ctx.save();
			
			// рисуем круг, в который впишем всё остальное
			cur.ctx.beginPath();
			cur.ctx.arc(radius, radius, radius - 1, 0, 2 * Math.PI);
			cur.ctx.clip();
			
			// отрисовываем увеличенное изображение
			cur.ctx.drawImage(cur.image, (-cur.x - .5) * cur.zoom + radius, (-cur.y - .5) * cur.zoom + radius, cur.image.width * cur.zoom, cur.image.height * cur.zoom);

			// восстанавливаем контекст
			cur.ctx.restore();
			
			// добавляем обводку обрезанному
			cur.ctx.lineWidth = .5;
			cur.ctx.stroke();
			
			// сохраняем состояние холста, чтобы не перекрашивать обводку
			cur.ctx.save();
			
			// получаем цвет
			cur.pixelData = cur.ctx.getImageData(radius + 1, radius + 1, 1, 1).data;
			cur.pixelColor = cur.dataToHex(cur.pixelData);

			// перекрашиваем курсор, если нужно
			if (cur.isCloseToWhite(cur.pixelData)) {
				cur.targetColor = '#000';
			} else {
				cur.targetColor = '#fff';
			};
			
			// рисуем прицел
			cur.ctx.strokeStyle = cur.targetColor;
			cur.ctx.strokeRect(radius - .5 - Math.floor(cur.zoom / 2), radius - .5 - Math.floor(cur.zoom / 2), cur.zoom + 1, cur.zoom + 1);
			
			// добавляем подложку для кода цвета
			cur.ctx.font = cur.zoom * 3 +'px monospace';
			cur.ctx.fillStyle = cur.pixelColor;
			cur.ctx.fillRect(radius - cur.zoom * 6, radius + cur.zoom * 3.5, cur.ctx.measureText(cur.pixelColor).width + cur.zoom, cur.zoom * 3);
			
			// добавляем код цвета
			cur.ctx.fillStyle = cur.targetColor;
			cur.ctx.fillText(cur.pixelColor, radius - cur.zoom * 5.5, radius + cur.zoom * 6);
			
			cur.ctx.restore();
		},
		
		// выставляем размеры курсора
		setSize: function () {
			
			// очищаем холст
			cur.canvas.height = cur.zoom * 12 * 2;
			cur.canvas.width = cur.zoom * 12 * 2;
			
			// убираем размытие при увеличении
			// http://stackoverflow.com/questions/7615009/disable-interpolation-when-scaling-a-canvas#answer-7665647
			cur.ctx.webkitImageSmoothingEnabled = false;
			cur.ctx.mozImageSmoothingEnabled = false;
			cur.ctx.imageSmoothingEnabled = false;
		},
		
		// выставляем положение курсора
		setPos: function () {
			cur.canvas.style.top = cur.imgOffset.top + cur.y - cur.zoom * 12 +'px';
			cur.canvas.style.left = cur.imgOffset.left + cur.x - cur.zoom * 12 +'px';
		},

		// обратное вычисление смещения курсора
		zoomPayoff: function (num) {
			return num * cur.zoom * cur.density;
		},

		// получение сдвига мыши
		getPos: function (event) {
			var movementX = event.movementX ||
			    event.mozMovementX          ||
			    event.webkitMovementX       ||
			    0;

			var movementY = event.movementY ||
			    event.mozMovementY      ||
			    event.webkitMovementY   ||
			    0;

			if (cur.movement.x < 0) {
				cur.movement.x = 0;
			}
			else if (cur.movement.x + movementX <= cur.img.width * cur.zoom * cur.density) {
				cur.movement.x += movementX;
			};

			if (cur.movement.y < 0) {
				cur.movement.y = 0;
			}
			else if (cur.movement.y + movementY <= cur.img.height * cur.zoom * cur.density) {
				cur.movement.y += movementY;
			};

			// вычисление положения курсора
			// замедляем курсор для удобства выбора точки
			cur.x = Math.floor(cur.movement.x / (cur.zoom * cur.density));
			cur.y = Math.floor(cur.movement.y / (cur.zoom * cur.density));

			// ограничения для курсора
			if (cur.x < 0) {
				cur.x = 0;
			};
			
			if (cur.y < 0) {
				cur.y = 0;
			};
			
			if (cur.x > cur.image.width - 1) {
				cur.x = cur.image.width - 1;
			};
			
			if (cur.y > cur.image.height - 1) {
				cur.y = cur.image.height - 1;
			};
		},

		// преобразование цвета
		dataToHex: function (data)
		{
			return "#" + ((1 << 24) + (data[0] << 16) + (data[1] << 8) + data[2]).toString(16).slice(1);
		},

		// проверка на белоту
		isCloseToWhite: function (pixelData)
		{
			if (pixelData[0] + pixelData[1] + pixelData[2] > 450) {
				return true;
			}
			else {
				return false;
			};
		}
	};

	// расширяем объект
	function extend (out) {
		out = out || {};

		for (var i = 1; i < arguments.length; i++) {
			if (!arguments[i])
				continue;

			for (var key in arguments[i]) {
				if (arguments[i].hasOwnProperty(key))
					out[key] = arguments[i][key];
			}
		}

		return out;
	};

	cur.initCur(img.src);

	return cur;
};
