import {tiny, defs} from './common.js';
import {Text_Line} from './text-demo.js';
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
        const phong   = new defs.Phong_Shader();
        const texture = new defs.Textured_Phong( 1 );
          const initial_corner_point = vec3( -1,-1,0 );
          const row_operation = (s,p) => p ? Mat4.translation( 0,.2,0 ).times(p.to4(1)).to3()
              : initial_corner_point;
          const column_operation = (t,p) =>  Mat4.translation( .2,0,0 ).times(p.to4(1)).to3();
                                      // Load the model file:
        this.shapes = {
            "TA1_head": new Shape_From_File( "assets/headTA1.obj" ),
            "TA1_hair": new Shape_From_File("assets/hairTA1.obj"),
            "TA1_glass": new Shape_From_File("assets/glassesTA1.obj"),
            "TA1_Body": new Shape_From_File("assets/bodyTA1.obj"),
            "TA1_Arm": new Shape_From_File("assets/armTA1.obj"),
            "TA1_Leg": new Shape_From_File("assets/ta1Leg.obj"),
            "TA1_Hand": new Shape_From_File("assets/handTA1.obj"),
            "TA1_Shoes": new Shape_From_File("assets/shoesTA1.obj"),

            "TA2_head": new Shape_From_File( "assets/headTA2.obj" ),
            "TA2_hair": new Shape_From_File("assets/hairTA2.obj"),
            "TA2_glass": new Shape_From_File("assets/glassesTA2.obj"),
            "TA2_Body": new Shape_From_File("assets/bodyTA2.obj"),
            "TA2_Arm": new Shape_From_File("assets/armTA2.obj"),
            "TA2_Leg": new Shape_From_File("assets/ta2Leg.obj"),
            "TA2_Hand": new Shape_From_File("assets/handTA2.obj"),
          //  "TA2_Shoes": new Shape_From_File("assets/shoesTA2.obj"),

            "backWall": new Shape_From_File("assets/backWall_empty.obj"),
            "frame": new Shape_From_File("assets/frame.obj"),
            "carpet": new Shape_From_File("assets/carpet.obj"),
            "bigScreen": new Shape_From_File("assets/bigScreen.obj"),
            "computerDesk": new Shape_From_File("assets/computerDesk.obj"),
            "computer": new Shape_From_File("assets/computer.obj"),
            "flag": new Shape_From_File("assets/uclaFlag2.obj"),
            "flag_pole": new Shape_From_File("assets/uclaFlag1.obj"),
            "flag_UCLA": new Shape_From_File("assets/uclaFlag3.obj"),
            "text": new Text_Line( 35 ),
            "square": new defs.Square(),
            "sheet" : new defs.Grid_Patch( 100, 100, row_operation, column_operation ),

//             "text": new Text_Line( 35 )

        };

        this.materials = {
            frame: new Material(new defs.Phong_Shader(),{color:color(0.396, 0.263, 0.129,1), ambient:0.3, diffusivity:0.3}),
            desk: new Material(new defs.Phong_Shader(),{color: color(1,1,1,1), ambient:0.6,diffusivity:0.3,specularity:0.5}),
            screen: new Material(new defs.Phong_Shader(), {color: color(0,0,0,0.99), ambient:0.6,diffusivity:0.3,specularity:0.5} ),
            Bigscreen: new Material(new defs.Phong_Shader(), {color: color(1,1,1,0.99), ambient:1, texture:new Texture("assets/earth.gif", false)}),
            flag: new Material(new defs.Phong_Shader(), {color: color(0,0.388,0.694,1), ambient:0.7}),
            flag_pole: new Material(new defs.Phong_Shader(), {color: color(0,0, 0, 1), ambient:1,diffusivity:0.3,specularity:0.5}),
            flag_UCLA: new Material(new defs.Phong_Shader(), {color: color(0.7,0.667,0,1), ambient:0.6,diffusivity:0.3,specularity:0.5}),
            carpet: new Material(new defs.Phong_Shader(), {color: color(0.16,0,0,1), ambient:0.7}),
            wall: new Material(new defs.Phong_Shader(), {color: color(0.45,0.45, 0.45, 1), ambient:0.6,diffusivity:0.3,specularity:0.5}),

            hair : new Material( new defs.Phong_Shader(),  { color: color( 0,0,0,1  ), ambient:0.5}),
            skin: new Material(new defs.Phong_Shader(), {color: color(1,0.87, 0.77, 1), ambient:0.5}),
            body: new Material(new defs.Phong_Shader(), {color: color(0.8,0.4,0,1), ambient:1}),
            shoe: new Material(new defs.Phong_Shader(), {color: color(0.696,0.963,0.329,1), ambient:1}),
            leg: new Material(new defs.Phong_Shader(), {color: color(0.7,0.667,0,1), ambient:1}),

            hair_2 : new Material( new defs.Phong_Shader(),  { color: color( 0.6,0.2,0,1  ), ambient:0.5}),
            skin_2: new Material(new defs.Phong_Shader(), {color: color(1,0.8, 0.4, 1), ambient:0.5}),
            body_2: new Material(new defs.Phong_Shader(), {color: color(0,0.23,0,1), ambient:1}),
            shoe_2: new Material(new defs.Phong_Shader(), {color: color(0.696,0.963,0.329,1), ambient:1}),
            leg_2: new Material(new defs.Phong_Shader(), {color: color(0.396,0.263,0.129,1), ambient:1}),
            text_image: new Material( texture, { ambient: 1, diffusivity: 0, specularity: 0,
                texture: new Texture( "assets/text.png" ) }),
            cover: new Material(texture, {ambient: 1, diffusivity: 0, specularity: 0,
                texture: new Texture("assets/cover.png")}),
            soil: new Material( new defs.Textured_Phong(1), { ambient: 1, texture: new Texture( "assets/grass.jpg" ) } ),
            // //sky: new Material(new defs.Textured_Phong(1), { color: color( 0.529,0.808,0.922,0.99), ambient:.4, texture: this.textures.sky})
            sky: new Material( new defs.Textured_Phong(1), { ambient: 1, texture: new Texture( "assets/sky2.png" ) } ),
        };
                                      // Don't create any DOM elements to control this scene:
        this.widget_options = { make_controls: true };
                                                          // Non bump mapped:
//          this.stars = new Material( new defs.Textured_Phong( 1 ),  { color: color( .5,.5,.5,1 ),
//            ambient: .3, diffusivity: .5, specularity: .5, texture: new Texture( "assets/stars.png" ) });
//                                                            // Bump mapped:
//          this.bumps = new Material( new defs.Fake_Bump_Map( 1 ), { color: color( .5,.5,.5,1 ),
//            ambient: .3, diffusivity: .5, specularity: .5, texture: new Texture( "assets/stars.png" ) });

//          this.text_image = new Material(new defs.Textured_Phong( 1 ), { ambient: 1, diffusivity: 0, specularity: 0,
//                                                  texture: new Texture( "assets/text.png" ) });






         this.TA1_arm_movement = false;
         this.TA2_arm_movement = false;
         this.TA1_punch = true;
         this.TA2_punch = true;

         this.initial_camera_location = Mat4.translation( 2,1,-25 ) ;

         this.attached = () => this.initial_camera_location;
         this.game_started = 0;
         this.timestamp = 0;

      }

      make_control_panel(){
          this.key_triggered_button( "Start Game", [ "Enter" ], function() { this.game_started = 1; } );
          this.new_line();
          this.key_triggered_button("View room", ["0"], () => this.attached = () => this.initial_camera_location);
          this.new_line();
          this.key_triggered_button("View TA 1", ["9"], () => this.attached = () => this.TA_1);
          this.new_line();
          this.key_triggered_button("View TA 1 side", ["8"], () => this.attached = () => this.TA_1_side);
          this.new_line();
          this.new_line();
          this.key_triggered_button("View TA 2", ["7"], () => this.attached = () => this.TA_2);
      };

    draw_start_screen(context, program_state) {
        let cover_transform = program_state.camera_inverse;
        let cover_scale = 0.877;
        cover_transform = cover_transform.times(Mat4.scale(cover_scale, cover_scale, cover_scale));
        cover_transform = cover_transform.times(Mat4.scale(1.8, 1, 1));
        cover_transform = cover_transform.times(Mat4.translation(-2.535,-2.28,54.62));
        this.shapes.square.draw( context, program_state, cover_transform, this.materials.cover);

        let my_string = "PRESS ENTER TO START\n";
        let text_transform = Mat4.identity();
        let title_scale = 0.02;
        text_transform = text_transform.times(Mat4.translation(-2.245,-1.33,24));
        text_transform = text_transform.times(Mat4.scale(title_scale, title_scale, title_scale));
        this.shapes.text.set_string(my_string, context.context);
        this.shapes.text.draw(context, program_state, text_transform, this.materials.text_image);
    }

    display( context, program_state )
      {
          const t = program_state.animation_time;
          this.lights = [new Light(vec4(0, 5, 5, 1), color(1,1,1,1),100000)];

          if( !context.scratchpad.controls )
              this.children.push( context.scratchpad.controls = new defs.Movement_Controls() );

          // Camera
          var desired = this.attached();

          // intro camera movements
          if (this.game_started && t < (this.timestamp + 2000)) {
              desired = this.TA_1;
          } else if (this.game_started && t < (this.timestamp + 4000)) {
              desired = this.TA_2;
          }



          if (desired === this.initial_camera_location){
              program_state.camera_transform = Mat4.inverse(desired).map((x, idx) => Vector.from(program_state.camera_transform[idx]).mix(x, 0.1))
          }
          else {
              desired = desired.times(Mat4.translation(0, 0, -5));
              program_state.camera_transform = Mat4.inverse(desired).map((x, idx) => Vector.from(program_state.camera_transform[idx]).mix(x, .1));
          }


          program_state.set_camera( Mat4.inverse(program_state.camera_transform) );








        // TA 1 transform
        var head_transform = Mat4.translation(-3, -2.8, 0)
                .times(Mat4.rotation(Math.PI*3/2, 0,1,0))
                .times(Mat4.scale(0.6,0.6,0.6));

        var model_transform2 = Mat4.translation(-3.1,-2.3,0.2)
                .times(Mat4.rotation(Math.PI*3/2, 0,1,0))
                .times(Mat4.scale(0.6,0.6,0.6));

        var glass_transform = Mat4.translation(-3, -2.7, 0.2)
            .times(Mat4.rotation(Math.PI*3/2, 0,1,0))
            .times(Mat4.scale(0.5,0.5,0.5));

        var body_transform = Mat4.translation(-3, -3.8, 0)
            .times(Mat4.rotation(Math.PI*3/2, 0,1,0))
            .times(Mat4.scale(0.5,0.5,0.5));

        //var right_arm = body_transform.times(Mat4.translation(0,-0.7,1.1));
        var left_arm = body_transform.times(Mat4.translation(0,-0.7,-1.1));



        var right_arm = Mat4.identity().times(Mat4.scale(0.5, 0.5, 0.5));
        var right_hand = Mat4.identity().times(Mat4.scale(0.25, 0.25, 0.25));


        if (this.TA1_arm_movement == true){
              right_arm = body_transform.times(Mat4.translation(0,-0.7,1.1));
              right_hand = right_arm.times(Mat4.translation(0,-1.3,0.1).times(Mat4.scale(0.5,0.5,0.5)));
        }
        else if (this.TA1_punch == true){
              right_arm = right_arm.times(Mat4.scale(1,1,-(0.5+Math.abs(Math.sin(Math.PI*t/500)))))
              .times(Mat4.translation(-7, -7.2, -0.8)).times(Mat4.rotation(Math.PI/2, 1,0,0));
              right_hand = right_hand.times(Mat4.translation(0,0,(-0.54+Math.abs(Math.sin(Math.PI*t/500)))))
                  .times(Mat4.translation(-14, -14.4, 4.2));
        }
        else{
              right_arm = right_arm.times(Mat4.rotation(-Math.abs(Math.sin(Math.PI*t/200)/4), 1,0,0))
                  .times(Mat4.translation(-7, -8.2, -0.8));
              right_hand = right_hand.times(Mat4.rotation(-Math.abs(Math.sin(Math.PI*t/200)/4), 1,0,0))
                  .times(Mat4.translation(-14, -18.4, -1.3));
        }
        this.TA_1 = Mat4.inverse(Mat4.translation(-3, -2.7, 0.2));
        this.TA_1_side = Mat4.inverse(head_transform.times(Mat4.translation(-7,0,7)));


        // TA 2 Transform

        var head_transform_ta2 = Mat4.translation(0, -3, 0)
            //.times(Mat4.rotation(Math.PI*2, 0,1,0))
            .times(Mat4.scale(0.6,0.6,0.6));

        var model_transform2_ta2 = Mat4.translation(0,-2.2,0)
            //.times(Mat4.rotation(Math.PI*2, 0,1,0))
            .times(Mat4.scale(0.5,0.5,0.5));

        var glass_transform_ta2 = Mat4.translation(0, -2.9, 0.2)
            //.times(Mat4.rotation(Math.PI*2, 0,1,0))
            .times(Mat4.scale(0.5,0.5,0.5));

        var body_transform_ta2 = Mat4.translation(0, -3.85, 0)
            //.times(Mat4.rotation(Math.PI, 0,1,0))
            .times(Mat4.scale(0.5,0.5,0.5));

        //var right_arm_ta2 = body_transform_ta2.times(Mat4.translation(-1.2,-0.7,-0.5)).times(Mat4.rotation(Math.sin(Math.PI*t/300)/2, 1,0,0));
        var left_arm_ta2 = body_transform_ta2.times(Mat4.translation(1.2,-0.7,-0.5));
        var right_arm_ta2 = Mat4.identity().times(Mat4.scale(0.5, 0.5, 0.5));

        var right_hand_ta2 = Mat4.identity().times(Mat4.scale(0.25, 0.25, 0.25));


        if (this.TA2_arm_movement == true){
              right_arm_ta2 = body_transform_ta2.times(Mat4.translation(-1.2,-0.7,-0.5));
              right_hand_ta2 = right_arm_ta2.times(Mat4.translation(0,-1,1).times(Mat4.scale(0.5,0.5,0.5)));
        }
        else{
              right_arm_ta2 = right_arm_ta2.times(Mat4.rotation(-Math.abs(Math.sin(Math.PI*t/200)/4), 1,0,0))
            .times(Mat4.translation(-1.2, -8.2, -0.8));
              right_hand_ta2 = right_hand_ta2.times(Mat4.rotation(-Math.abs(Math.sin(Math.PI*t/200)/4), 1,0,0))
            .times(Mat4.translation(-2.4, -18.4, -0.8));
        }
        this.TA_2 = Mat4.inverse(head_transform_ta2.times(Mat4.translation(1.5,0,0)));



        //program_state.set_camera( Mat4.translation( 0,0,-24 ) );    // Locate the camera here (inverted matrix).
        program_state.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, 1, 100 );
                                                // A spinning light to show off the bump map:
        // program_state.lights = [ new Light(
        //                          Mat4.rotation( t/300,   1,0,0 ).times( vec4( 3,2,10,1 ) ),
        //                                      color( 1,.7,.7,1 ), 100000 ) ];
        program_state.lights = this.lights;

        this.shapes.backWall.draw(context,program_state,Mat4.scale(7.5,7.5,7.5),this.materials.wall);
        this.shapes.frame.draw(context,program_state,Mat4.scale(6.6,6.6,6.6).times(Mat4.translation(-0.185,0.35,-0.04)),this.materials.frame);

        this.shapes.bigScreen.draw(context,program_state,Mat4.scale(2.2,2.2,2.2).times(Mat4.translation(-1.5,-2.42,-1)), this.materials.Bigscreen);

        this.shapes.carpet.draw(context,program_state,Mat4.scale(1.8,1.5,1.8).times(Mat4.translation(-1.3,-3.92,3.5)),this.materials.carpet);

          this.shapes.flag.draw(context,program_state,Mat4.scale(2.5,2.5,2.5).times(Mat4.translation(-3,-0.9,1.3)),this.materials.flag);
          this.shapes.flag_pole.draw(context,program_state,Mat4.scale(2.5,2.5,2.5).times(Mat4.translation(-3,-1.3,0)),this.materials.flag_pole);
          this.shapes.flag_pole.draw(context,program_state,Mat4.scale(2.5,2.5,2.5).times(Mat4.translation(-3,-1.3,1)),this.materials.flag_pole);
          this.shapes.flag_pole.draw(context,program_state,Mat4.scale(2.5,2.5,2.5).times(Mat4.translation(-3, -1.3,2)),this.materials.flag_pole);
          this.shapes.flag_pole.draw(context,program_state,Mat4.scale(2.5,2.5,2.5).times(Mat4.translation(-3,-1.3,3)),this.materials.flag_pole);
          this.shapes.flag_UCLA.draw(context,program_state,Mat4.scale(2.5,2.5,2.5).times(Mat4.translation(-2.97,-0.55,1.1)),this.materials.flag_UCLA);

        this.shapes.computerDesk.draw(context,program_state,Mat4.translation(3.8,-5.55,1.5),this.materials.desk);
        this.shapes.computer.draw(context,program_state,Mat4.translation(3.8,-4.1,1.5),this.materials.screen);

        this.shapes.computerDesk.draw(context,program_state,Mat4.translation(3.8,-5.55,6),this.materials.desk);
        this.shapes.computer.draw(context,program_state,Mat4.translation(3.8,-4.1,6),this.materials.screen);





//         let line =  Text_Line.toString();

//         this.shapes.text.set_string( line, context.context );
//         this.shapes.text.draw( context, program_state, Mat4.scale(3,3,3).times(Mat4.translation(0,0,3))
//                                                  .times( Mat4.scale( .03,.03,.03 ) ), this.Text_image );








        this.shapes.TA1_hair.draw( context, program_state, model_transform2, this.materials.hair);
        this.shapes.TA1_head.draw(context, program_state,head_transform, this.materials.skin);
        this.shapes.TA1_glass.draw(context, program_state,glass_transform, this.materials.hair);
        this.shapes.TA1_Body.draw(context, program_state,body_transform, this.materials.body);
        this.shapes.TA1_Arm.draw(context, program_state,right_arm, this.materials.body);
        this.shapes.TA1_Arm.draw(context, program_state,left_arm, this.materials.body);
        this.shapes.TA1_Hand.draw(context, program_state, right_hand, this.materials.skin);
        this.shapes.TA1_Hand.draw(context, program_state, left_arm.times(Mat4.translation(0,-1.3,0.1).times(Mat4.scale(0.5,0.5,0.5))), this.materials.skin);
        this.shapes.TA1_Leg.draw(context, program_state,body_transform.times(Mat4.translation(0, -3.7,0.4)), this.materials.leg);
        this.shapes.TA1_Leg.draw(context, program_state,body_transform.times(Mat4.translation(0, -3.7,-0.4)), this.materials.leg);
        // this.shapes.TA1_Shoes.draw(context, program_state,body_transform.times(Mat4.translation(0.7, -4.7,-0.4).times(Mat4.scale(0.8,0.8,0.8))), this.materials.skin);
        // this.shapes.TA1_Shoes.draw(context, program_state,body_transform.times(Mat4.translation(0.7, -4.7,0.4).times(Mat4.scale(0.8,0.8,0.8))), this.materials.skin);



        this.shapes.TA2_hair.draw( context, program_state, model_transform2_ta2, this.materials.hair_2);
        this.shapes.TA2_head.draw(context, program_state,head_transform_ta2, this.materials.skin_2);
        this.shapes.TA2_glass.draw(context, program_state,glass_transform_ta2, this.materials.hair);
        this.shapes.TA2_Body.draw(context, program_state,body_transform_ta2, this.materials.body_2);
        this.shapes.TA2_Arm.draw(context, program_state,right_arm_ta2, this.materials.body_2);
        this.shapes.TA2_Arm.draw(context, program_state,left_arm_ta2, this.materials.body_2);
        this.shapes.TA2_Hand.draw(context, program_state, right_hand_ta2, this.materials.skin);
        this.shapes.TA2_Hand.draw(context, program_state, left_arm_ta2.times(Mat4.translation(0,-1,1).times(Mat4.scale(0.5,0.5,0.5))), this.materials.skin);
        this.shapes.TA2_Leg.draw(context, program_state,body_transform_ta2.times(Mat4.translation(-0.4, -3.5,0)), this.materials.leg_2);
        this.shapes.TA2_Leg.draw(context, program_state,body_transform_ta2.times(Mat4.translation(0.4, -3.5,0)), this.materials.leg_2);


        if (!this.game_started) {
            program_state.set_camera(this.initial_camera_location);
            this.draw_start_screen(context, program_state);
            this.timestamp = t;
        }

        var soil_transform = Mat4.translation(0, -6, -20).times(Mat4.rotation(Math.PI/2, 1, 0, 0)).times(Mat4.scale(200, 200, 200));
        this.shapes.sheet.draw(context, program_state, soil_transform, this.materials.soil);

        var sky_transform = Mat4.translation(0, 8, -20).times(Mat4.rotation(Math.PI/2, 1, 0, 0)).times(Mat4.scale(200, 200, 200));
        this.shapes.sheet.draw(context, program_state, sky_transform, this.materials.sky);

        var mt_transform = Mat4.translation(0, 0, -50).times(Mat4.scale(200, 200, 200));
        this.shapes.sheet.draw(context, program_state, mt_transform, this.materials.sky);
      }


  }