import {tiny, defs} from './common.js';
                                                  // Pull these names into this module's scope for convenience:
const {Vector, vec3, vec4, vec, color, Mat4, Light, Shape, Material, Shader, Texture, Scene } = tiny;

export class Shape_From_File extends Shape
{                                   // **Shape_From_File** is a versatile standalone Shape that imports
                                    // all its arrays' data from an .obj 3D model file.
  constructor( filename )
    { super( "position", "normal", "texture_coord" );
                                    // Begin downloading the mesh. Once that completes, return
                                    // control to our parse_into_mesh function.
      this.load_file( filename );
    }
  load_file( filename )
      {                             // Request the external file and wait for it to load.
                                    // Failure mode:  Loads an empty shape.
        return fetch( filename )
          .then( response =>
            { if ( response.ok )  return Promise.resolve( response.text() )
              else                return Promise.reject ( response.status )
            })
          .then( obj_file_contents => this.parse_into_mesh( obj_file_contents ) )
          .catch( error => { this.copy_onto_graphics_card( this.gl ); } )
      }
  parse_into_mesh( data )
    {                           // Adapted from the "webgl-obj-loader.js" library found online:
      var verts = [], vertNormals = [], textures = [], unpacked = {};   

      unpacked.verts = [];        unpacked.norms = [];    unpacked.textures = [];
      unpacked.hashindices = {};  unpacked.indices = [];  unpacked.index = 0;

      var lines = data.split('\n');

      var VERTEX_RE = /^v\s/;    var NORMAL_RE = /^vn\s/;    var TEXTURE_RE = /^vt\s/;
      var FACE_RE = /^f\s/;      var WHITESPACE_RE = /\s+/;

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        var elements = line.split(WHITESPACE_RE);
        elements.shift();

        if      (VERTEX_RE.test(line))   verts.push.apply(verts, elements);
        else if (NORMAL_RE.test(line))   vertNormals.push.apply(vertNormals, elements);
        else if (TEXTURE_RE.test(line))  textures.push.apply(textures, elements);
        else if (FACE_RE.test(line)) {
          var quad = false;
          for (var j = 0, eleLen = elements.length; j < eleLen; j++)
          {
              if(j === 3 && !quad) {  j = 2;  quad = true;  }
              if(elements[j] in unpacked.hashindices) 
                  unpacked.indices.push(unpacked.hashindices[elements[j]]);
              else
              {
                  var vertex = elements[ j ].split( '/' );

                  unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 0]);
                  unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 1]);   
                  unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 2]);
                  
                  if (textures.length) 
                    {   unpacked.textures.push(+textures[( (vertex[1] - 1)||vertex[0]) * 2 + 0]);
                        unpacked.textures.push(+textures[( (vertex[1] - 1)||vertex[0]) * 2 + 1]);  }
                  
                  unpacked.norms.push(+vertNormals[( (vertex[2] - 1)||vertex[0]) * 3 + 0]);
                  unpacked.norms.push(+vertNormals[( (vertex[2] - 1)||vertex[0]) * 3 + 1]);
                  unpacked.norms.push(+vertNormals[( (vertex[2] - 1)||vertex[0]) * 3 + 2]);
                  
                  unpacked.hashindices[elements[j]] = unpacked.index;
                  unpacked.indices.push(unpacked.index);
                  unpacked.index += 1;
              }
              if(j === 3 && quad)   unpacked.indices.push( unpacked.hashindices[elements[0]]);
          }
        }
      }
      {
      const { verts, norms, textures } = unpacked;
        for( var j = 0; j < verts.length/3; j++ )
        { 
          this.arrays.position     .push( vec3( verts[ 3*j ], verts[ 3*j + 1 ], verts[ 3*j + 2 ] ) );        
          this.arrays.normal       .push( vec3( norms[ 3*j ], norms[ 3*j + 1 ], norms[ 3*j + 2 ] ) );
          this.arrays.texture_coord.push( vec( textures[ 2*j ], textures[ 2*j + 1 ] ) );
        }
        this.indices = unpacked.indices;
      }
      this.normalize_positions( false );
      this.ready = true;
    }
  draw( context, program_state, model_transform, material )
    {               // draw(): Same as always for shapes, but cancel all 
                    // attempts to draw the shape before it loads:
      if( this.ready )
        super.draw( context, program_state, model_transform, material );
    }
}

// export class Text_Line extends Shape                
// {                           // **Text_Line** embeds text in the 3D world, using a crude texture 
//                             // method.  This Shape is made of a horizontal arrangement of quads.
//                             // Each is textured over with images of ASCII characters, spelling 
//                             // out a string.  Usage:  Instantiate the Shape with the desired
//                             // character line width.  Then assign it a single-line string by calling
//                             // set_string("your string") on it. Draw the shape on a material
//                             // with full ambient weight, and text.png assigned as its texture 
//                             // file.  For multi-line strings, repeat this process and draw with
//                             // a different matrix.
//   constructor( max_size )
//     { super( "position", "normal", "texture_coord" );
//       this.max_size = max_size;
//       var object_transform = Mat4.identity();
//       for( var i = 0; i < max_size; i++ )
//       {                                       // Each quad is a separate Square instance:
//         defs.Square.insert_transformed_copy_into( this, [], object_transform );
//         object_transform.post_multiply( Mat4.translation( 1.5,0,0 ) );
//       }
//     }
//   set_string( line, context )
//     {           // set_string():  Call this to overwrite the texture coordinates buffer with new 
//                 // values per quad, which enclose each of the string's characters.
//       this.arrays.texture_coord = [];
//       for( var i = 0; i < this.max_size; i++ )
//         {
//           var row = Math.floor( ( i < line.length ? line.charCodeAt( i ) : ' '.charCodeAt() ) / 16 ),
//               col = Math.floor( ( i < line.length ? line.charCodeAt( i ) : ' '.charCodeAt() ) % 16 );

//           var skip = 3, size = 32, sizefloor = size - skip;
//           var dim = size * 16,  
//               left  = (col * size + skip) / dim,      top    = (row * size + skip) / dim,
//               right = (col * size + sizefloor) / dim, bottom = (row * size + sizefloor + 5) / dim;

//           this.arrays.texture_coord.push( ...Vector.cast( [ left,  1-bottom], [ right, 1-bottom ],
//                                                           [ left,  1-top   ], [ right, 1-top    ] ) );
//         }
//       if( !this.existing )
//         { this.copy_onto_graphics_card( context );
//           this.existing = true;
//         }
//       else
//         this.copy_onto_graphics_card( context, ["texture_coord"], false );
//     }
// }

export class Obj_File_Demo extends Scene     
  {                           // **Obj_File_Demo** show how to load a single 3D model from an OBJ file.
                              // Detailed model files can be used in place of simpler primitive-based
                              // shapes to add complexity to a scene.  Simpler primitives in your scene
                              // can just be thought of as placeholders until you find a model file
                              // that fits well.  This demo shows the teapot model twice, with one 
                              // teapot showing off the Fake_Bump_Map effect while the other has a 
                              // regular texture and Phong lighting.             
    constructor()                               
      { super();
                                      // Load the model file:
        this.shapes = {
            "TA1_head": new Shape_From_File( "assets/headTA1.obj" ),
            "TA1_hair": new Shape_From_File("assets/hairTA1.obj"),
            "glass": new Shape_From_File("assets/glass.obj"),
            "TA1_Body": new Shape_From_File("assets/ta1Body.obj"),
            "TA1_Arm": new Shape_From_File("assets/ta1Arm.obj"),
            "TA1_Leg": new Shape_From_File("assets/ta1Leg.obj"),

            "backWall": new Shape_From_File("assets/backWall_empty.obj"),
            "frame": new Shape_From_File("assets/frame.obj"),
            "carpet": new Shape_From_File("assets/carpet.obj"),
            "bigScreen": new Shape_From_File("assets/bigScreen.obj"),
            "computerDesk": new Shape_From_File("assets/computerDesk.obj"),
            "computer": new Shape_From_File("assets/computer.obj"),
            "flag": new Shape_From_File("assets/uclaFlag.obj")

//             "text": new Text_Line( 35 )

        };

        this.materials = {
            frame: new Material(new defs.Phong_Shader(),{color:color(0.396, 0.263, 0.129,1), ambient:0.3, diffusivity:0.3}),
            desk: new Material(new defs.Phong_Shader(),{color: color(1,1,1,1), ambient:0.6,diffusivity:0.3,specularity:0.5}),
            screen: new Material(new defs.Phong_Shader(), {color: color(0,0,0,0.99), ambient:0.6,diffusivity:0.3,specularity:0.5} ),
            carpet: new Material(new defs.Phong_Shader(), {color: color(0.4,0.5,0.6,1), ambient:0.7}),     
            wall: new Material(new defs.Phong_Shader(), {color: color(0.45,0.45, 0.45, 1), ambient:0.6,diffusivity:0.3,specularity:0.5}),
            hair : new Material( new defs.Phong_Shader(),  { color: color( 0,0,0,1 ), ambient:0.5}),
            skin: new Material(new defs.Phong_Shader(), {color: color(1,0.87, 0.77, 1), ambient:1,diffusivity:0,specularity:0})
        };
                                      // Don't create any DOM elements to control this scene:
        this.widget_options = { make_controls: false };
                                                          // Non bump mapped:
//          this.stars = new Material( new defs.Textured_Phong( 1 ),  { color: color( .5,.5,.5,1 ),
//            ambient: .3, diffusivity: .5, specularity: .5, texture: new Texture( "assets/stars.png" ) });
//                                                            // Bump mapped:
//          this.bumps = new Material( new defs.Fake_Bump_Map( 1 ), { color: color( .5,.5,.5,1 ),
//            ambient: .3, diffusivity: .5, specularity: .5, texture: new Texture( "assets/stars.png" ) });

//          this.text_image = new Material(new defs.Textured_Phong( 1 ), { ambient: 1, diffusivity: 0, specularity: 0,
//                                                  texture: new Texture( "assets/text.png" ) });

         this.lights = [new Light(vec4(0, 5, 5, 1), color(1,1,1,1),100000)];
      }
    display( context, program_state )
      { const t = program_state.animation_time;

        program_state.set_camera( Mat4.translation( 0,0,-24 ) );    // Locate the camera here (inverted matrix).
        program_state.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, 1, 500 );
                                                // A spinning light to show off the bump map:
        // program_state.lights = [ new Light(
        //                          Mat4.rotation( t/300,   1,0,0 ).times( vec4( 3,2,10,1 ) ),
        //                                      color( 1,.7,.7,1 ), 100000 ) ];
        program_state.lights = this.lights;

        

        
        this.shapes.backWall.draw(context,program_state,Mat4.scale(7.5,7.5,7.5),this.materials.wall);
        this.shapes.frame.draw(context,program_state,Mat4.scale(6.3,6.3,6.3).times(Mat4.translation(-0.185,0.35,0.17)),this.materials.frame);

        this.shapes.bigScreen.draw(context,program_state,Mat4.scale(2.2,2.2,2.2).times(Mat4.translation(-1.5,-2.4,-1)), this.materials.screen);

        this.shapes.carpet.draw(context,program_state,Mat4.scale(1.8,1.5,1.8).times(Mat4.translation(-1.3,-3.5,3.5)),this.materials.carpet);


        this.shapes.flag.draw(context,program_state,Mat4.scale(2.5,2.5,2.5).times(Mat4.translation(-3,-1,1.3)),this.materials.carpet);


        this.shapes.computerDesk.draw(context,program_state,Mat4.translation(3.8,-5.3,1.5),this.materials.desk);
        this.shapes.computer.draw(context,program_state,Mat4.translation(3.8,-3.85,1.5),this.materials.screen);

        this.shapes.computerDesk.draw(context,program_state,Mat4.translation(3.8,-5.3,6),this.materials.desk);
        this.shapes.computer.draw(context,program_state,Mat4.translation(3.8,-3.85,6),this.materials.screen);


//         let line =  Text_Line.toString();

//         this.shapes.text.set_string( line, context.context );
//         this.shapes.text.draw( context, program_state, Mat4.scale(3,3,3).times(Mat4.translation(0,0,3))
//                                                  .times( Mat4.scale( .03,.03,.03 ) ), this.Text_image );



        var model_transform = Mat4.translation(0.1, -2.5, 0)
                .times(Mat4.rotation(Math.PI/2, 0,1,0))
                .times(Mat4.scale(0.5,0.5,0.5));

        var model_transform2 = Mat4.translation(0,-2,0)
                .times(Mat4.rotation(Math.PI*3/2, 0,1,0))
                .times(Mat4.scale(0.5,0.5,0.5));

        this.shapes.TA1_hair.draw( context, program_state, model_transform2, this.materials.hair );
        this.shapes.TA1_head.draw(context, program_state, model_transform, this.materials.skin);
 
        
//         for( let i of [ -1, 1 ] )
//         {                                       // Spin the 3D model shapes as well.
//           const model_transform = Mat4.rotation( t/2000,   0,2,1 )
//                           .times( Mat4.translation( 2*i, 0, 0 ) )
//                           .times( Mat4.rotation( t/1500,   -1,2,0 ) )
//                           .times( Mat4.rotation( -Math.PI/2,   1,0,0 ) );
//                 }
      }

  }