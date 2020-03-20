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


export class Scene_Setup extends Scene     
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
            "text": new Text_Line( 50 ),
            "square": new defs.Square(),
            "sheet" : new defs.Grid_Patch( 100, 100, row_operation, column_operation ),
            "sheet2" : new defs.Grid_Patch( 3, 3, row_operation, column_operation ),
            "sheet3" : new defs.Grid_Patch( 2, 5, row_operation, column_operation ),

            "blood" : new defs.Cube(),
            "gameover": new Text_Line( 35 ),
            "HP": new Text_Line( 35 ),

//             "text": new Text_Line( 35 )

        };
        this.textures = {
            smoke: new Texture("assets/Smoke.png", "LINEAR"),

        };
        this.explosion_material = new Material(new defs.Billboard_Explosion_Shader(), {
            color: color(0, 0, 0, 1),
            smoke: this.textures.smoke,
        });
        this.emitters = {
            "smoke": new defs.Particle_Emitter(1000),
        };
        this.explosions = [
            //create initial explosion to prevent lag later
            {
                "shape": new defs.Billboard_Quad(),
                "mat": Mat4.translation(0, -10, 0)
            }
        ];

        this.materials = {
            blood: new Material(new defs.Phong_Shader(),{color:color(0,1,0,1),ambient: 0.3, diffusivity:0.5}),
            frame: new Material(new defs.Phong_Shader(),{color:color(0.05, 0.05, 0.05,1), ambient:0.3, diffusivity:0.3}),
            desk: new Material(new defs.Phong_Shader(),{color: color(1,1,1,1), ambient:0.6,diffusivity:0.3,specularity:0.5}),
            screen: new Material(new defs.Phong_Shader(), {color: color(0,0,0,0.99), ambient:0.6,diffusivity:0.3,specularity:0.5} ),
            Bigscreen: new Material(new defs.Phong_Shader(), {color: color(0,0,0,0.99), ambient:1, texture:new Texture("assets/earth.gif", false)}),
            flag: new Material(new defs.Phong_Shader(), {color: color(0.224,0.451,0.675,1), ambient:0.5,diffusivity:0.1,specularity:1}),
            flag_pole: new Material(new defs.Phong_Shader(), {color: color(0,0, 0, 1), ambient:1,diffusivity:0.3,specularity:0.5,shadow:true}),
            flag_UCLA: new Material(new defs.Phong_Shader(), {color: color(0.7,0.667,0,1), ambient:0.6,diffusivity:0.5,specularity:0.5}),
            carpet: new Material(new defs.Funny_Shader(), {color: color(0.16,0.23,0.16,1), ambient:0.7}),
            wall: new Material(new defs.Phong_Shader(), {color: color(0.45,0.45, 0.45, 1), ambient:0.6,diffusivity:0.3,specularity:0.5}),

            hair : new Material( new defs.Phong_Shader(),  { color: color( 0,0,0,1  ), ambient:0.5}),
            skin: new Material(new defs.Phong_Shader(), {color: color(1,0.87, 0.77, 1), ambient:0.5}),
            body: new Material(new defs.Phong_Shader(), {color: color(0.02,0.02,0.02,1), ambient:1,shadow:true}),
            shoe: new Material(new defs.Phong_Shader(), {color: color(0.696,0.963,0.329,1), ambient:1}),
            leg: new Material(new defs.Phong_Shader(), {color: color(0.4,0.4,0.4,1), ambient:1}),

            hair_2 : new Material( new defs.Phong_Shader(),  { color: color( 0.6,0.2,0,1  ), ambient:0.5}),
            skin_2: new Material(new defs.Phong_Shader(), {color: color(1,0.8, 0.4, 1), ambient:0.5}),
            body_2: new Material(new defs.Phong_Shader(), {color: color(0,0.23,0,1), ambient:1}),
            shoe_2: new Material(new defs.Phong_Shader(), {color: color(0.696,0.963,0.329,1), ambient:1}),
            leg_2: new Material(new defs.Phong_Shader(), {color: color(0,0,0,1), ambient:0.5}),
            text_image: new Material( texture, { ambient: 1, diffusivity: 0, specularity: 0,
                texture: new Texture( "assets/text.png" ) }),
            cover: new Material(texture, {ambient: 1, diffusivity: 0, specularity: 0,
                texture: new Texture("assets/cover.png")}),
            soil: new Material( new defs.Textured_Phong(1), { ambient: 1, texture: new Texture( "assets/moon.jpg" ) } ),
            // //sky: new Material(new defs.Textured_Phong(1), { color: color( 0.529,0.808,0.922,0.99), ambient:.4, texture: this.textures.sky})
            sky: new Material( new defs.Textured_Phong(1), { ambient: 1, texture: new Texture( "assets/universe.jpg" ) } ),
            matrix: new Material( new defs.Texture_Scroll_Y(1), { ambient: 1, texture: new Texture( "assets/matrix3.jpg" ) } ),
            small_screen: new Material( new defs.Textured_Phong(1), { ambient: 1, texture: new Texture( "assets/small_screen.jpg" ) } ),
        };
                                      // Don't create any DOM elements to control this scene:
        this.widget_options = { make_controls: true };




         this.TA1_arm_movement = false;
         this.TA2_arm_movement = false;
         this.TA1_punch = true;
         this.TA2_punch = true;

         this.initial_camera_location = Mat4.translation( 2,1,-25 ) ;

         this.attached = () => this.initial_camera_location;
         this.game_started = 0;
         this.timestamp = 0;

         this.desired = this.attached();
         this.TA_trans = Mat4.identity();

         this.correct = -1;
         this.blood = -1;

         this.selected = false;
         this.progress = 0;
         this.input = -1;
         this.choice = -1;

         this.TA = -1;

      }

      make_control_panel(){
          this.key_triggered_button( "Start Game", [ "Enter" ], function() { this.game_started = 1; } );
          this.new_line();
          this.key_triggered_button("Choose Left", ["j"], function () {
              this.selected = true;
              this.input = false;
          });
          this.new_line();
          this.key_triggered_button("Choose Right", ["k"], function () {
              this.selected = true;
              this.input = true;
          });
          this.new_line();
          this.new_line();
          this.key_triggered_button("View room", ["0"], () => this.attached = () => this.initial_camera_location);
          this.new_line();
          this.key_triggered_button("View TA 1", ["9"], () => this.attached = () => this.TA_1);
          this.new_line();
          this.key_triggered_button("View TA 1 side", ["8"], () => this.attached = () => this.TA_1_side);
          this.new_line();

          this.new_line();
          this.key_triggered_button("View TA 2", ["7"], () => this.attached = () => this.TA_2);

          this.new_line();
          this.key_triggered_button("correct/incorrect", ["6"], () => {

            this.correct = !this.correct;
            if (this.correct == false){
                  this.blood = this.blood-1;
            }

        })
      };


    draw_blood(context, program_state, transform, blood){

          
          if (blood > 0){

               let my_string = "HP";
               let title_scale = 0.02;
               this.shapes.HP.set_string(my_string, context.context);
               this.shapes.HP.draw(context, program_state,  Mat4.translation(-1,0,0).times(transform), this.materials.text_image);


               for(var i = 0; i <blood; i++){

                     this.shapes.blood.draw(context, program_state, transform, this.materials.blood);
                     transform = Mat4.translation(0.8,0,0).times(transform);
                }

          }
          else if (blood == 0){
               let my_string = "Game Over";
               let title_scale = 0.02;
               this.shapes.gameover.set_string(my_string, context.context);
               this.shapes.gameover.draw(context, program_state,  Mat4.translation(-0.6,-0.4,0).times(transform), this.materials.text_image);
          }
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
    };

    

    display( context, program_state )
      {
          const t = program_state.animation_time;
          this.lights = [new Light(vec4(0, 5, 5, 1), color(1,1,1,1),100000)];

          if( !context.scratchpad.controls )
              this.children.push( context.scratchpad.controls = new defs.Movement_Controls() );

          // Camera
          var TA1_text_trans = Mat4.scale(0.1,0.1,0.1).times(Mat4.translation(-55,-20,9));
          var TA2_text_trans = Mat4.scale(0.1,0.1,0.1).times(Mat4.translation(-20,-20,9));
          
           // intro animation
          if (this.game_started && t < (this.timestamp + 3000)) {
              this.desired = this.TA_1;
              // text
              let mystring = "This is your first TA\n";
              let text_transform = Mat4.identity();
              text_transform = text_transform.times(Mat4.scale(0.1,0.1,0.1));
              text_transform = text_transform.times(Mat4.translation(-45,-40,8));
              this.shapes.text.set_string(mystring, context.context);
              this.shapes.text.draw(context, program_state, text_transform, this.materials.text_image);
          } else if (this.game_started && t < (this.timestamp + 6000)) {
              this.desired = this.TA_2;
              // text
              let mystring = "This is your second TA\n";
              let text_transform = Mat4.identity();
              text_transform = text_transform.times(Mat4.scale(0.1,0.1,0.1));
              text_transform = text_transform.times(Mat4.translation(-10,-40,8));
              this.shapes.text.set_string(mystring, context.context);
              this.shapes.text.draw(context, program_state, text_transform, this.materials.text_image);
          } else if (this.game_started && t < (this.timestamp + 9000)) {
              this.desired = this.initial_camera_location;
              // text
              let mystring = "Now you must save them!\n";
              let text_transform = Mat4.identity();
              text_transform = text_transform.times(Mat4.scale(0.1,0.1,0.1));
              text_transform = text_transform.times(Mat4.translation(-35,-10,220));
              this.shapes.text.set_string(mystring, context.context);
              this.shapes.text.draw(context, program_state, text_transform, this.materials.text_image);
          } else if (this.game_started && t < (this.timestamp + 12000)) {
              this.desired = this.initial_camera_location;
              // text
              let mystring = "by winning their hearts!!\n";
              let text_transform = Mat4.identity();
              text_transform = text_transform.times(Mat4.scale(0.1,0.1,0.1));
              text_transform = text_transform.times(Mat4.translation(-37,-10,220));
              this.shapes.text.set_string(mystring, context.context);
              this.shapes.text.draw(context, program_state, text_transform, this.materials.text_image);
          }

          // gameplay starts
          if (this.game_started && this.progress === 0 && t > (this.timestamp + 12000)) {
              this.desired = this.initial_camera_location.times(Mat4.translation(0,2,20));
              let mystring = "Choose which TA to save (first?)\n";
              let text_transform = Mat4.identity();
              text_transform = text_transform.times(Mat4.scale(0.1,0.1,0.1));
              text_transform = text_transform.times(Mat4.translation(-43,-40,50));
              this.shapes.text.set_string(mystring, context.context);
              this.shapes.text.draw(context, program_state, text_transform, this.materials.text_image);

              mystring = "Choose Left (j)\n";
              text_transform = Mat4.identity();
              text_transform = text_transform.times(Mat4.scale(0.1,0.1,0.1));
              text_transform = text_transform.times(Mat4.translation(-45,-45,50));
              this.shapes.text.set_string(mystring, context.context);
              this.shapes.text.draw(context, program_state, text_transform, this.materials.text_image);

              mystring = "Choose Right (k)\n";
              text_transform = Mat4.identity();
              text_transform = text_transform.times(Mat4.scale(0.1,0.1,0.1));
              text_transform = text_transform.times(Mat4.translation(-15,-45,50));
              this.shapes.text.set_string(mystring, context.context);
              this.shapes.text.draw(context, program_state, text_transform, this.materials.text_image);

              if (this.selected) {
                  this.progress += 1;
                  this.selected = false;
                  this.choice = this.input;
                  this.TA = this.input;
                  this.blood = 3;
              }
          }

          if (this.game_started && this.progress === 1) {
              if (!this.TA) {
                      this.desired = this.TA_1.times(Mat4.translation(0,0,-1));
                      this.TA_trans = TA1_text_trans;
              }
              else{
                      this.desired = this.TA_2.times(Mat4.translation(0,0,-1));
                      this.TA_trans = TA2_text_trans;
              }

              let mystring = "Do you want to change your choice?\n";
                 
              this.shapes.text.set_string(mystring, context.context);
              this.shapes.text.draw(context, program_state, this.TA_trans, this.materials.text_image);

              mystring = "Yes (j)\n";
              this.shapes.text.set_string(mystring, context.context);
              this.shapes.text.draw(context, program_state, this.TA_trans.times(Mat4.translation(0,-20,0)), this.materials.text_image);

              mystring = "No (k)\n";
              this.shapes.text.set_string(mystring, context.context);
              this.shapes.text.draw(context, program_state, this.TA_trans.times(Mat4.translation(25,-20,0)), this.materials.text_image);

              if (this.selected) {
                      this.selected = false;
                      this.progress += 1;

                      if (this.input === false) {
                          this.choice = true;
                          
                          this.TA = !this.TA;
                      } 
                      else {
                          this.choice = false;
                      }
              }
              
          }
          

          if (this.game_started && this.progress === 2){
                if(!this.TA){
                      this.desired = this.TA_1.times(Mat4.translation(0,0,-1));
                      this.TA_trans = TA1_text_trans;
                }
                else{
                      this.desired = this.TA_2.times(Mat4.translation(0,0,-1));
                      this.TA_trans = TA2_text_trans;
                }
                let mystring = "So I will ask you a few questions...\n";
                this.shapes.text.set_string(mystring, context.context);
                this.shapes.text.draw(context, program_state, this.TA_trans, this.materials.text_image);

                mystring = "( Press K to continue... )\n";
                this.shapes.text.set_string(mystring, context.context);
                this.shapes.text.draw(context, program_state, this.TA_trans.times(Mat4.translation(0,-10,0)), this.materials.text_image);

                if (this.selected) {
                      this.selected = false;
                      this.progress += 1;
                }
          }

          if (this.game_started && this.blood == 0) {
              if (!this.TA) {
                  this.desired = this.TA_1.times(Mat4.translation(0,0,-1));
                  this.TA_trans = TA1_text_trans;
                  let mystring = "You failed to save your TA! \n";
                  this.shapes.text.set_string(mystring, context.context);
                  this.shapes.text.draw(context, program_state, this.TA_trans, this.materials.text_image);

                  mystring = "Thank you for playing\n";
                  this.shapes.text.set_string(mystring, context.context);
                  this.shapes.text.draw(context, program_state, this.TA_trans.times(Mat4.translation(0,-20,0)), this.materials.text_image);
              } 
              else {
                  this.desired = this.TA_2.times(Mat4.translation(0,0,-1));
                  this.TA_trans = TA2_text_trans;
                  let mystring = "You failed to save your TA! \n";
                  this.shapes.text.set_string(mystring, context.context);
                  this.shapes.text.draw(context, program_state, this.TA_trans, this.materials.text_image);

                  mystring = "Thank you for playing\n";
                  this.shapes.text.set_string(mystring, context.context);
                  this.shapes.text.draw(context, program_state, this.TA_trans.times(Mat4.translation(0,-20,0)), this.materials.text_image);
              }
          }

          if (this.game_started && this.progress === 3 && this.blood > 0){
                if(!this.TA){
                      this.desired = this.TA_1.times(Mat4.translation(0,0,-1));
                      this.TA_trans = TA1_text_trans;
                }
                else{
                      this.desired = this.TA_2.times(Mat4.translation(0,0,-1));
                      this.TA_trans = TA2_text_trans;
                }
                let mystring = "What is my full name?\n";
                this.shapes.text.set_string(mystring, context.context);
                this.shapes.text.draw(context, program_state, this.TA_trans, this.materials.text_image);

                mystring = "Yunqi Guo (j)\n";
                this.shapes.text.set_string(mystring, context.context);
                this.shapes.text.draw(context, program_state, this.TA_trans.times(Mat4.translation(0,-20,0)), this.materials.text_image);

                mystring = "Tianqi Wu (k)\n";
                this.shapes.text.set_string(mystring, context.context);
                this.shapes.text.draw(context, program_state, this.TA_trans.times(Mat4.translation(25,-20,0)), this.materials.text_image);
                
                if (this.selected) {
                      this.selected = false;
                      this.progress += 1;
                      if (this.input === false) {
                          this.choice = false;
                          this.correct = true;
                      } else {
                          this.choice = true;
                          this.correct = false;
                          this.blood -= 1;
                      }
                 }
          }

          if (this.game_started && this.progress === 4 && this.blood > 0){
                if(!this.TA){
                      this.desired = this.TA_1.times(Mat4.translation(0,0,-1));
                      this.TA_trans = TA1_text_trans;
                }
                else{
                      this.desired = this.TA_2.times(Mat4.translation(0,0,-1));
                      this.TA_trans = TA2_text_trans;
                }
                let mystring = "When was orthographic projection first introduced?\n";
                this.shapes.text.set_string(mystring, context.context);
                this.shapes.text.draw(context, program_state, this.TA_trans.times(Mat4.translation(-11,0,0)), this.materials.text_image);


                mystring = "1900 B.C. (j)\n";
                this.shapes.text.set_string(mystring, context.context);
                this.shapes.text.draw(context, program_state, this.TA_trans.times(Mat4.translation(0,-20,0)), this.materials.text_image);

                mystring = "2000 B.C. (k)\n";
                this.shapes.text.set_string(mystring, context.context);
                this.shapes.text.draw(context, program_state, this.TA_trans.times(Mat4.translation(25,-20,0)), this.materials.text_image);
                
                if (this.selected) {
                      this.selected = false;
                      this.progress += 1;
                      if (this.input === false) {
                          this.choice = false;
                          this.correct = false;
                          this.blood -= 1;
                      } else {
                          this.choice = true;
                          this.correct = true;
                      }
                 }
          }
          if (this.game_started && this.progress === 5 && this.blood > 0){
                if(!this.TA){
                      this.desired = this.TA_1.times(Mat4.translation(0,0,-1));
                      this.TA_trans = TA1_text_trans;
                }
                else{
                      this.desired = this.TA_2.times(Mat4.translation(0,0,-1));
                      this.TA_trans = TA2_text_trans;
                }
                let mystring = "Which company produced Luxo Jr.?\n";
                this.shapes.text.set_string(mystring, context.context);
                this.shapes.text.draw(context, program_state, this.TA_trans, this.materials.text_image);


                mystring = "Disney (j)\n";
                this.shapes.text.set_string(mystring, context.context);
                this.shapes.text.draw(context, program_state, this.TA_trans.times(Mat4.translation(0,-20,0)), this.materials.text_image);

                mystring = "Pixar (k)\n";
                this.shapes.text.set_string(mystring, context.context);
                this.shapes.text.draw(context, program_state, this.TA_trans.times(Mat4.translation(25,-20,0)), this.materials.text_image);
                
                if (this.selected) {
                      this.selected = false;
                      this.progress += 1;
                      if (this.input === false) {
                          this.choice = false;
                          this.correct = false;
                          this.blood -= 1;
                      } else {
                          this.choice = true;
                          this.correct = true;
                      }
                 }
          }
          if (this.game_started && this.progress === 6 && this.blood > 0){
                if(!this.TA){
                      this.desired = this.TA_1.times(Mat4.translation(0,0,-1));
                      this.TA_trans = TA1_text_trans;
                }
                else{
                      this.desired = this.TA_2.times(Mat4.translation(0,0,-1));
                      this.TA_trans = TA2_text_trans;
                }
                let mystring = "When was the coordinate system introduced?\n";
                this.shapes.text.set_string(mystring, context.context);
                this.shapes.text.draw(context, program_state, this.TA_trans.times(Mat4.translation(-5,0,0)), this.materials.text_image);


                mystring = "16th Century (j)\n";
                this.shapes.text.set_string(mystring, context.context);
                this.shapes.text.draw(context, program_state, this.TA_trans.times(Mat4.translation(0,-20,0)), this.materials.text_image);

                mystring = "17th Century (k)\n";
                this.shapes.text.set_string(mystring, context.context);
                this.shapes.text.draw(context, program_state, this.TA_trans.times(Mat4.translation(25,-20,0)), this.materials.text_image);
                
                if (this.selected) {
                      this.selected = false;
                      this.progress += 1;
                      if (this.input === false) {
                          this.choice = false;
                          this.correct = false;
                          this.blood -= 1;
                      } else {
                          this.choice = true;
                          this.correct = true;
                      }
                 }
          }

          if (this.game_started && this.progress === 7 && this.blood > 0){
                if(!this.TA){
                      this.desired = this.TA_1.times(Mat4.translation(0,0,-1));
                      this.TA_trans = TA1_text_trans;
                }
                else{
                      this.desired = this.TA_2.times(Mat4.translation(0,0,-1));
                      this.TA_trans = TA2_text_trans;
                }
                let mystring = "When was the term Computer Graphics first stated?\n";
                this.shapes.text.set_string(mystring, context.context);
                this.shapes.text.draw(context, program_state, this.TA_trans, this.materials.text_image);

                mystring = "1960's (j)\n";
                this.shapes.text.set_string(mystring, context.context);
                this.shapes.text.draw(context, program_state, this.TA_trans.times(Mat4.translation(0,-20,0)), this.materials.text_image);

                mystring = "1950's (k)\n";
                this.shapes.text.set_string(mystring, context.context);
                this.shapes.text.draw(context, program_state, this.TA_trans.times(Mat4.translation(25,-20,0)), this.materials.text_image);
                
                if (this.selected) {
                      this.selected = false;
                      this.progress += 1;
                      if (this.input === false) {
                          this.choice = false;
                          this.correct = true;
                      } else {
                          this.choice = true;
                          this.correct = false;
                          this.blood -= 1;
                      }
                 }
          }

          if (this.game_started && this.progress === 8 && this.blood > 0){
                if(!this.TA){
                      this.desired = this.TA_1.times(Mat4.translation(0,0,-1));
                      this.TA_trans = TA1_text_trans;
                }
                else{
                      this.desired = this.TA_2.times(Mat4.translation(0,0,-1));
                      this.TA_trans = TA2_text_trans;
                }
                let mystring = "What was the best selling game of all times?\n";
                this.shapes.text.set_string(mystring, context.context);
                this.shapes.text.draw(context, program_state, this.TA_trans, this.materials.text_image);

                mystring = "Tetris (j)\n";
                this.shapes.text.set_string(mystring, context.context);
                this.shapes.text.draw(context, program_state, this.TA_trans.times(Mat4.translation(0,-20,0)), this.materials.text_image);

                mystring = "Super Mario (k)\n";
                this.shapes.text.set_string(mystring, context.context);
                this.shapes.text.draw(context, program_state, this.TA_trans.times(Mat4.translation(25,-20,0)), this.materials.text_image);
                
                if (this.selected) {
                      this.selected = false;
                      this.progress += 1;
                      if (this.input === false) {
                          this.choice = false;
                          this.correct = true;
                      } else {
                          this.choice = true;
                          this.correct = false;
                          this.blood -= 1;
                      }
                 }
          }

          if (this.game_started && this.progress === 9 && this.blood > 0){
                if(!this.TA){
                      this.desired = this.TA_1.times(Mat4.translation(0,0,-1));
                      this.TA_trans = TA1_text_trans;
                }
                else{
                      this.desired = this.TA_2.times(Mat4.translation(0,0,-1));
                      this.TA_trans = TA2_text_trans;
                }
                let mystring = "Am I hot?\n";
                this.shapes.text.set_string(mystring, context.context);
                this.shapes.text.draw(context, program_state, this.TA_trans, this.materials.text_image);

                mystring = "You bet! (j)\n";
                this.shapes.text.set_string(mystring, context.context);
                this.shapes.text.draw(context, program_state, this.TA_trans.times(Mat4.translation(0,-20,0)), this.materials.text_image);

                mystring = "Absolutely! (k)\n";
                this.shapes.text.set_string(mystring, context.context);
                this.shapes.text.draw(context, program_state, this.TA_trans.times(Mat4.translation(25,-20,0)), this.materials.text_image);
                
                if (this.selected) {
                      this.selected = false;
                      this.progress += 1;
                      if (this.input === false) {
                          this.choice = false;
                          this.correct = true;
                      } else {
                          this.choice = true;
                          this.correct = true;
                      }
                 }
          }

          if (this.game_started && (this.progress === 10)) {
              if (!this.TA) {
                  this.desired = this.TA_1.times(Mat4.translation(0,0,-1));
                  let mystring = "Congratulations! You saved your TA.\n";
                  let text_transform = Mat4.identity();
                  text_transform = text_transform.times(Mat4.scale(0.1,0.1,0.1));
                  text_transform = text_transform.times(Mat4.translation(-55,-20,9));
                  this.shapes.text.set_string(mystring, context.context);
                  this.shapes.text.draw(context, program_state, text_transform, this.materials.text_image);

                  mystring = "Thank you for playing!\n";
                  text_transform = Mat4.identity();
                  text_transform = text_transform.times(Mat4.scale(0.1,0.1,0.1));
                  text_transform = text_transform.times(Mat4.translation(-55,-30,9));
                  this.shapes.text.set_string(mystring, context.context);
                  this.shapes.text.draw(context, program_state, text_transform, this.materials.text_image);
              } 
              else {
                  this.desired = this.TA_2.times(Mat4.translation(0,0,-1));
                  let mystring = "Congratulations! You saved your TA.";
                  let text_transform = Mat4.identity();
                  text_transform = text_transform.times(Mat4.scale(0.1,0.1,0.1));
                  text_transform = text_transform.times(Mat4.translation(-20,-20,9));
                  this.shapes.text.set_string(mystring, context.context);
                  this.shapes.text.draw(context, program_state, text_transform, this.materials.text_image);

                  mystring = "Thank you for playing!\n";
                  text_transform = Mat4.identity();
                  text_transform = text_transform.times(Mat4.scale(0.1,0.1,0.1));
                  text_transform = text_transform.times(Mat4.translation(-20,-30,9));
                  this.shapes.text.set_string(mystring, context.context);
                  this.shapes.text.draw(context, program_state, text_transform, this.materials.text_image);
              }
          }



          if (this.desired === this.initial_camera_location){
              program_state.camera_transform = Mat4.inverse(this.desired).map((x, idx) => Vector.from(program_state.camera_transform[idx]).mix(x, 0.1))
          }
          else {
              this.desired = this.desired.times(Mat4.translation(0, 0, -5));
              program_state.camera_transform = Mat4.inverse(this.desired).map((x, idx) => Vector.from(program_state.camera_transform[idx]).mix(x, .1));
          }


          program_state.set_camera( Mat4.inverse(program_state.camera_transform) );








        // TA 1 transform
        


        var body_transform = Mat4.translation(-3, -3.8, 0)
            .times(Mat4.rotation(Math.PI*3/2, 0,1,0))
            .times(Mat4.scale(0.5,0.5,0.5));    


        var head_transform = Mat4.translation(0, 1, 0)
                .times(body_transform)
                .times(Mat4.scale(1.2,1.2,1.2));

        if (!this.TA){
              if (this.correct == true){
                    body_transform = Mat4.translation(0, (0.5*Math.abs(Math.sin(Math.PI*t/500))), 0).times(body_transform);
                    head_transform = Mat4.translation(0, 1, 0)
                      .times(body_transform)
                      .times(Mat4.scale(1.2,1.2,1.2));
              }
              else if (this.correct == false){
                    head_transform = head_transform.times(Mat4.rotation(Math.sin(Math.PI*t/350),0,1,0));

              }
        }
        var model_transform2 = Mat4.translation(-0.1,0.6,0.2)
                .times(head_transform);

        var glass_transform = Mat4.translation(0, 0.1, 0.2)
            .times(head_transform)
            .times(Mat4.scale(0.84,0.84,0.84));

        

        //var right_arm = body_transform.times(Mat4.translation(0,-0.7,1.1));
        var left_arm = body_transform.times(Mat4.translation(0,-0.7,-1.1));



        var right_arm = body_transform.times(Mat4.translation(3, 3.8, 0)).times(Mat4.rotation(-Math.PI*3/2, 0,1,0));
        var right_hand = body_transform.times(Mat4.translation(3, 3.8, 0)).times(Mat4.rotation(-Math.PI*3/2, 0,1,0)).times(Mat4.scale(0.5, 0.5, 0.5));


        if (this.TA1_arm_movement == true){
              right_arm = body_transform.times(Mat4.translation(0,-0.7,1.1));
              right_hand = right_arm.times(Mat4.translation(0,-1.3,0.1).times(Mat4.scale(0.5,0.5,0.5)));
        }
        else if (this.TA1_punch == true){
              right_arm = Mat4.translation(0,0,-1.4).times(right_arm).times(Mat4.scale(1,1,-(0.55+0.8*Math.abs(Math.sin(Math.PI*t/500)))))
              .times(Mat4.translation(-1.1, -3.7, -0.79)).times(Mat4.rotation(Math.PI/2, 1,0,0));
              right_hand = Mat4.translation(-0.25,-0.9,0).times(right_hand).times(Mat4.translation(0,0,(-1.75+2*Math.abs(Math.sin(Math.PI*t/500)))))
                  .times(Mat4.translation(-1.1, -3.7, -1.3));
        }
        else{
              right_arm = right_arm.times(Mat4.rotation(-Math.abs(Math.sin(Math.PI*t/200)/4), 1,0,0))
                  .times(Mat4.translation(-7, -8.2, -0.8));
              right_hand = right_hand.times(Mat4.rotation(-Math.abs(Math.sin(Math.PI*t/200)/4), 1,0,0))
                  .times(Mat4.translation(-14, -18.4, -1.3));
        }


        this.TA_1 = Mat4.inverse(Mat4.translation(-3, -2.7, 0.2));
        this.TA_1_side = Mat4.inverse(Mat4.translation(0, 1, 0)
                .times((Mat4.translation(-3, -3.8, 0)
            .times(Mat4.rotation(Math.PI*3/2, 0,1,0))
            .times(Mat4.scale(0.5,0.5,0.5))))
                .times(Mat4.scale(1.2,1.2,1.2)).times(Mat4.translation(-7,0,7)));


        // TA 2 Transform



        var head_transform_ta2 = Mat4.translation(0, -3, 0)
            //.times(Mat4.rotation(Math.PI*2, 0,1,0))
            .times(Mat4.scale(0.6,0.6,0.6));

        


        var body_transform_ta2 = Mat4.translation(0, -3.85, 0)
            //.times(Mat4.rotation(Math.PI, 0,1,0))
            .times(Mat4.scale(0.5,0.5,0.5));

        if (this.TA){
              if (this.correct == true){
                    body_transform_ta2 = Mat4.translation(0, (0.5*Math.abs(Math.sin(Math.PI*t/500))), 0).times(body_transform_ta2);
                    head_transform_ta2 = Mat4.translation(0, 1, 0)
                      .times(body_transform_ta2)
                      .times(Mat4.scale(1.2,1.2,1.2));
              }
              else if (this.correct == -1){}
              else{
                    head_transform_ta2 = head_transform_ta2.times(Mat4.rotation(Math.sin(Math.PI*t/350),0,1,0));

              }
        }

        var model_transform2_ta2 = Mat4.translation(0,0.8,0)
                .times(head_transform_ta2).times(Mat4.scale(0.9,0.9,0.9));

        var glass_transform_ta2 = Mat4.translation(0, 0.1, 0.2)
            .times(head_transform_ta2)
            .times(Mat4.scale(0.84,0.84,0.84));

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
        
        this.TA_2 = Mat4.inverse(Mat4.translation(0, -2.7, 0.2));
        this.TA_2_side = Mat4.inverse(Mat4.translation(0, 1, 0)
                .times((Mat4.translation(0, -3.8, 0)
            .times(Mat4.rotation(-Math.PI*3/2, 0,1,0))
            .times(Mat4.scale(0.5,0.5,0.5))))
                .times(Mat4.scale(1.2,1.2,1.2)).times(Mat4.translation(-7,0,7)));



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

        this.shapes.carpet.draw(context,program_state,Mat4.scale(2.5,1.5,2.5).times(Mat4.translation(-1.2,-3.92,1.5)),this.materials.carpet);

          this.shapes.flag.draw(context,program_state,Mat4.scale(2.5,2.5,2.5).times(Mat4.translation(-3,-0.9,1.3)),this.materials.desk);
          this.shapes.flag_pole.draw(context,program_state,Mat4.scale(2.5,2.5,2.5).times(Mat4.translation(-3,-1.3,0)),this.materials.flag_pole);
          this.shapes.flag_pole.draw(context,program_state,Mat4.scale(2.5,2.5,2.5).times(Mat4.translation(-3,-1.3,1)),this.materials.flag_pole);
          this.shapes.flag_pole.draw(context,program_state,Mat4.scale(2.5,2.5,2.5).times(Mat4.translation(-3, -1.3,2)),this.materials.flag_pole);
          this.shapes.flag_pole.draw(context,program_state,Mat4.scale(2.5,2.5,2.5).times(Mat4.translation(-3,-1.3,3)),this.materials.flag_pole);
          this.shapes.flag_UCLA.draw(context,program_state,Mat4.scale(2.5,2.5,2.5).times(Mat4.translation(-2.97,-0.55,1.1)),this.materials.flag);

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
        this.shapes.TA1_Leg.draw(context, program_state,body_transform.times(Mat4.translation(0, -3.7,0.4)), this.materials.body);
        this.shapes.TA1_Leg.draw(context, program_state,body_transform.times(Mat4.translation(0, -3.7,-0.4)), this.materials.body);
        // this.shapes.TA1_Shoes.draw(context, program_state,body_transform.times(Mat4.translation(0.7, -4.7,-0.4).times(Mat4.scale(0.8,0.8,0.8))), this.materials.skin);
        // this.shapes.TA1_Shoes.draw(context, program_state,body_transform.times(Mat4.translation(0.7, -4.7,0.4).times(Mat4.scale(0.8,0.8,0.8))), this.materials.skin);
        
        var blood_transform = Mat4.scale(0.2,0.2,0.2);
        if (!this.TA){
              blood_transform = blood_transform.times(Mat4.translation(-18, -4.5, 0));
        }    
        else{
              blood_transform = blood_transform.times(Mat4.translation(-3, -4.5, 0));
        }
        if (this.TA != -1) this.draw_blood(context,program_state,blood_transform,this.blood);


        this.shapes.TA2_hair.draw( context, program_state, model_transform2_ta2, this.materials.hair_2);
        this.shapes.TA2_head.draw(context, program_state,head_transform_ta2, this.materials.skin_2);
        this.shapes.TA2_glass.draw(context, program_state,glass_transform_ta2, this.materials.hair);
        this.shapes.TA2_Body.draw(context, program_state,body_transform_ta2, this.materials.body);
        this.shapes.TA2_Arm.draw(context, program_state,right_arm_ta2, this.materials.body);
        this.shapes.TA2_Arm.draw(context, program_state,left_arm_ta2, this.materials.body);
        this.shapes.TA2_Hand.draw(context, program_state, right_hand_ta2, this.materials.skin_2);
        this.shapes.TA2_Hand.draw(context, program_state, left_arm_ta2.times(Mat4.translation(0,-1,1).times(Mat4.scale(0.5,0.5,0.5))), this.materials.skin_2);
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

        var screen_transform = Mat4.translation(3.1, 3.5, -1.8).times(Mat4.scale(9, 9, 9));
        this.shapes.sheet2.draw(context, program_state, screen_transform, this.materials.matrix);

        var s_screen_transform = Mat4.translation(3.65, -2.15, 2.9).times(Mat4.rotation(-Math.PI/2, 0, 1, 0)).times(Mat4.scale(2, 2, 2));
        this.shapes.sheet2.draw(context, program_state, s_screen_transform, this.materials.small_screen);

        var s_screen2_transform = Mat4.translation(3.65, -2.15, 7.35).times(Mat4.rotation(-Math.PI/2, 0, 1, 0)).times(Mat4.scale(2, 2, 2));
        this.shapes.sheet2.draw(context, program_state, s_screen2_transform, this.materials.small_screen);
      }


  }
