define(function(require, exports, module) {
	/**
	 * 支持hash类型的urls
	 * 提供易用的api
	 * 不自动运行
	 * 在需要的时候监听变化
	 */
	var Route = {
		'routes': [], //保存当前已经注册的路由
		'mode': null, //‘hash’或者'history'(是否运用History API)
		'root': '/', //应用的根目录，只在用pushState的情况下需要
		'config': function(options) {
			//如果模式是history，则必须支持 history.pushState方法
			this.mode = options && options.mode && options.mode == 'history' && !!(history.pushState) ? 'history' : 'hash';
			this.root = options && options.root ? '/' + this.clearSlashes(options.root) + '/' : '/';
			return this;
		},
		/*
		 *用于去除 开始与结束的斜杠
		 */
		'clearSlashes': function(path) {
			return path.toString().replace(/\/$/, '').replace(/^\//, '');
		},
		/**
		 *获取当前url
		 */
		'getFragment': function() {
			var fragment = '';
			//如果是history模式,需要删除url的根部
			if (this.mode === 'history') {
				var path = decodeURI(location.pathname + location.search);
				fragment = this.clearSlashes(path);
				fragment = fragment.replace(/\?(.*)$/, '');
				fragment = this.root != '/' ? fragment.replace(this.root, '') : fragment;
			}
			//如果是hash模式
			else {
				var match = window.location.href.match(/#(.*)$/);
				fragment = match ? match[1] : '';
			}
			return this.clearSlashes(fragment);
		},
		/**
		 * 添加路由
		 * 如果只传入一个函数，则被认为是默认路由
		 */
		'add': function(re, handler) {
			if (typeof re == 'function') {
				handler = re;
				re = '';
			}
			//fixed TODO 这里把push改成 unshift。
			this.routes.unshift({
				're': re,
				'handler': handler
			});
			//返回this 是为了更好地进行链式操作
			return this;
		},
		/**
		 * 删除路由
		 *
		 */
		'remove': function(param) {
			for (var i = 0; i < this.routes.length; i++) {
				var r = this.routes[i];
				if (r.handler == param || r.toString() == param.toString()) {
					this.routes.splice(i, 1);
					return this;
				}
			}
			return this;
		},
		/**
		 *初始化类
		 */
		'flush': function() {
			this.routes = [];
			this.mode = null;
			this.root = '/';
			return this;
		},
		/**
		 * 根据url fragment进行回调
		 *
		 */
		'check': function(f) {
			var that = this;
			var fragment = f || that.getFragment();
			for (var i = 0; i < that.routes.length; i++) {
				var match = fragment.match(that.routes[i].re);
				if (match) {
					match.shift();
					that.routes[i].handler.apply({}, match);
					return that;
				}
			}
			return that;
		},
		/**
		 *改变urls
		 */
		'change': function(path) {
			path = path ? this.clearSlashes(path) : '';
			//如果是 history模式
			if (this.mode == 'history') {
				history.pushState(null, null, this.root + path);
			}
			//如果是 hash模式
			else {
				window.location.href.match(/#(.*)$/);
				window.location.href = window.location.href.replace(/#(.*)$/, '') + '#' + path
			}
			return this;
		},
		/**
		 *检测变化
		 *
		 */
		'listen': function() {
			var that = this;
			//添加页面load的事件
			window.addEventListener('load', function(){
				that.check(that.getFragment());
			});
			window.addEventListener('hashchange', function(){
				that.check( that.getFragment());
			});

			// var current = that.getFragment();
			// var fn = function() {
			// 		//当当前url发生变化时，则进行check方法，进行回调
			// 		if (current!= that.getFragment()) {
			// 			current = that.getFragment();
			// 			that.check(current);
			// 		}
			// 	}
			// 	//先清空之前的监测
			// this.interval = setInterval(fn, 50);
			return this;
		}
	}
	module.exports = Route;
});