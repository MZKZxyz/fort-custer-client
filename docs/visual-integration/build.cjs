// Uses the repository's existing toolchain; emits a self-contained static review.
const webpack = require('webpack');
const path = require('node:path');
webpack({ mode:'production', entry:path.join(__dirname,'source/app.jsx'),
  output:{path:__dirname,filename:'app.js'}, devtool:false,
  module:{rules:[{test:/\.jsx?$/,exclude:/node_modules/,use:{loader:'babel-loader',options:{
    babelrc:false,configFile:false,presets:[['@babel/preset-react',{runtime:'automatic'}]]}}}]},
  performance:{hints:false},
},(error,stats)=>{
  if(error || stats.hasErrors()) { console.error(error || stats.toString({all:false,errors:true})); process.exitCode=1; }
  else console.log(stats.toString({all:false,assets:true,timings:true}));
});
