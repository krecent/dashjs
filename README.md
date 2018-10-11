# DashboardJS

[![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](LICENSE.md)


DashboardJS is a Javascript library that handles dashboard events, asyncronous views, AJAX requests and responses, form handling and resource actions, allowing you to concentrate on your front-end application logic. This Library is suitable for building typical web admin dashboard applications simple or complex.

## Install

Include dist/dashboard.min.js in dashboard home

```html
<script src="your-js-directory/dashboard.min.js"></script>
```

## Usage
You can access the global Dashboard, Events, Global, Actions and Handlers objects. All functionality is attached to these objects.

```js
var data = Dashboard.serializeFormData();

Dashboard.actionAjax('route/to/your/server', data, function(response) {
	console.log(response);
	
	// Do whatever you want with response
});
```
## Contributing

Contributions are welcome, [Check Here](https://github.com/krecent/dashboardjs/graphs/contributors) :)

## Documentation

Documentation [here](https://github.com/krecent/dashboardjs/wiki/Documentation) updates coming

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
