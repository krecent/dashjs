# DashJS

[![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](LICENSE.md)


DashJS is a Javascript library specially designed for dashboard based web apps but also can be used for all web application. DashJS handles events, asyncronous views/pages, AJAX requests and responses, form handling, resource actions etc., allowing you to concentrate on your application logic.

## Install

Include dist/dash.min.js in dashboard home

```html
<script src="js/dashjs.min.js"></script>
```

**npm**  
npm i dashjs --save  

## Usage
All functionality is wrapped within the `Dash` object.

```js

Dash.request('route/to/your/server', data, function(response) {
	console.log(response);
	
	// Do whatever you want with response
});
```

## Documentation

Documentation [here](https://github.com/krecent/dashjs/wiki/home)

## Contributing

Contributions are welcome, [Check Here](https://github.com/krecent/dashjs/graphs/contributors) :)

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
