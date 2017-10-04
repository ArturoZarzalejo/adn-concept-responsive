// Querido programador:
// Cuando escribí este código, sóloo Dios y yo
// sabíamos cómo funcionaba.
// Ahora, ¡sólo Dios lo sabe!
//
// Así que si está tratando de 'optimizar'
// esta rutina y fracasa, por favor,
// incremente el siguiente contador
// como una advertencia
// para el siguiente colega:
//
// total_horas_perdidas_aqui = 0;

var matrixTrans = (function(){

  function matrixTrans (){
    
    // for(i in fn){
    //   this[i] = fn[i];
    // }

  };

  matrixTrans.prototype = {

    info: function(){
      console.log(this);
    },
    
    /*
    * @param {int} x New x position
    * @param {int} y New y position
    * @param {string} transform style property
    */
    move: function(){
      var matrix = this.stringToMatrix(arguments[2]);
      //move X axis in matrix
      matrix[12] += arguments[0];
      //move Y axis in matrix
      matrix[13] += arguments[1];

      return this.matrixToString(matrix);
    },
    /*
    * @param {int} x X axis increment
    * @param {int} y Y axis increment
    * @param {string} transform style property
    * @param {int} width actual element width
    * @param {int} height actual element height
    * @param {obj} resizePoint {x: x, y: y}
    * @param {boolean} lock scale
    */
    resize: function(){
      var matrix = this.stringToMatrix(arguments[2]),
          angle = this.getAngle(matrix),
          scaleX = matrix[0] / Math.cos(angle),
          scaleY = matrix[5] / Math.cos(angle),
          refPoint = arguments[5] || {x:1, y:1},
          xNewAxis = arguments[0]*Math.cos(angle) + arguments[1]*Math.sin(angle),
          yNewAxis = - arguments[0]*Math.sin(angle) + arguments[1]*Math.cos(angle),
          width = arguments[3] / scaleX,
          height = arguments[4] / scaleY;

      var newScaleX = ( ( scaleX * width + (refPoint.x ? 1 : -1) * xNewAxis ) / width ),
          newScaleY = ( ( scaleY * height + (refPoint.y ? 1 : -1) * yNewAxis ) / height );


      // IF Lock scale
      if(arguments[6]){
        resize = newScaleX/scaleX > newScaleY/scaleY ? newScaleX/scaleX : newScaleY/scaleY;
        
        newScaleX = scaleX * resize;
        newScaleY = scaleY * resize;
      }
      
      // console.log('width', scaleX, arguments[3], width);
      // console.log('height', scaleY, arguments[4], height);
      // scale X axis in matrix
      matrix[0] = newScaleX * Math.cos(angle);
      matrix[1] =  newScaleX * Math.sin(angle);
      // scale Y axis in matrix
      matrix[5] = newScaleY * Math.cos(angle);
      matrix[4] = - newScaleY * Math.sin(angle);

      //move X axis in matrix
      matrix[12] = matrix[12] + (refPoint.x ? 1 : -1) * (width*newScaleX - width*scaleX)/2;
      //move Y axis in matrix
      matrix[13] = matrix[13] + (refPoint.y ? 1 : -1) * (height*newScaleY - height*scaleY)/2;

      return this.matrixToString(matrix);
    },

     /*
    * @param {int} angle angle in degrees
    * @param {string} transform style property
    */
    rotate: function(){
      var matrix = this.stringToMatrix(arguments[1]),
          oldAngle = this.getAngle(matrix),
          newAngle = arguments[0],
          scaleX = matrix[0] / Math.cos(oldAngle),
          scaleY = matrix[5] / Math.cos(oldAngle);
          // console.log('angle', newAngle.toFixed(4));
      //scale X axis in matrix
      matrix[0] = scaleX * Math.cos(newAngle);
      matrix[1] = - scaleX * Math.sin(newAngle);
      //scale Y axis in matrix
      matrix[5] = scaleY * Math.cos(newAngle);
      matrix[4] = scaleY * Math.sin(newAngle);
            
      return this.matrixToString(matrix);
    },

    

    matrixToString: function(){

      var matrix = arguments[0] || [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
      var string = 'matrix3d(';
      for(var i = 0; i < matrix.length; i++){
        string = string + (i == 0 ? '' : ',') + matrix[i];
      }
      string = string + ')';
      return string;
    },

    stringToMatrix: function(){
      var string = arguments[0] || 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)';
      string = string.replace('matrix3d(', '');
      string = string.replace(')', '');
      matrix = string.split(',');
      for(var i = 0; i < matrix.length; i++){
        matrix[i] = parseFloat(matrix[i]);
      }
      return matrix;
    },

    /*
    * @param {array} matrix
    */
    getAngle: function(){
      var matrix = arguments[0];
      var angle = Math.atan(matrix[1]/matrix[0]);

      if(matrix[0] < 0){
        angle = (matrix[1] > 0 ? -1 : 1 ) * Math.PI + angle;
      }

      return angle;
    },

    /*
    * @param {array} matrix
    */
    getScale: function(){
      var matrix = arguments[0],
          angle = this.getAngle(matrix),
          scaleX = matrix[0] / Math.cos(angle),
          scaleY = matrix[5] / Math.cos(angle);

      return {
        x: Math.abs(scaleX),
        y: Math.abs(scaleY),
        angle: angle
      };
    },

    /*
    * @param {string} matrix
    * @param {float} width
    * @param {float} height
    */
    getContainerMatrix: function(){
      var matrix = this.stringToMatrix(arguments[0]),
          menu = this.stringToMatrix(arguments[0]),
          angle = this.getAngle(matrix),
          scaleX = matrix[0] / Math.cos(angle),
          scaleY = matrix[5] / Math.cos(angle),
          width = arguments[1],
          height = arguments[2],
          realWidth = (width-Math.abs(Math.tan(angle))*height)/(Math.abs(Math.cos(angle))-Math.abs(Math.sin(angle))*Math.abs(Math.tan(angle))),
          realHeight = (height-Math.abs(Math.tan(angle))*width)/(Math.abs(Math.cos(angle))-Math.abs(Math.sin(angle))*Math.abs(Math.tan(angle)));

      // scale X axis in matrix
      menu[0] = 1;
      menu[1] =  0;
      // scale Y axis in matrix
      menu[5] = 1;
      menu[4] = 0;
      //move X axis in matrix
      menu[12] = matrix[12] + 30;
      //move Y axis in matrix
      menu[13] = matrix[13] - 70 - (height - realHeight)/2 + (realHeight - realHeight*scaleY)/2;
      

      return {
        matrix: this.matrixToString(matrix),
        menu: this.matrixToString(menu),
        scaleX: Math.abs(scaleX),
        scaleY: Math.abs(scaleY)
      };
    },

  };

  return matrixTrans;
  
})();