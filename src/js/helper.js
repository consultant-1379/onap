Handlebars.registerHelper('ifObject', function(item, options) {
  if (typeof item === 'object') {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper('ifnNaN', function(item, options) {
  if (isNaN(item)==true) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper('Dive', function(info) {
    let template = Handlebars.compile($('script#dive').html());
    return template(this);
});
