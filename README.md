# Agario Clone
![agario game](./img/agario_game.PNG)
*Created in 2017*<br>
A clone of the popular MMO game [Agar.io](https://agar.io/).<br>
It is written as a multiplayer server with a login page, the basic game and highscores.

# How to run
To start the server you can run the command `npm start`.<br>
A server will be started on `http://localhost:3000`.<br>
You can also build a docker image with the [Dockerfile](./Dockerfile) provided.<br>
Then you can run the game in a docker container.<br>
When you first launch the game, no users will be registered.<br>
On the login page there is a link where you can register users.<br>
This will create a `users.db` file with the username and passwords (hashed).<br>
Highscores will be stored in a `highscores.db` file.

# Controls
`mouse` the blob will take the direction your mouse is pointed at.<br>
`space bar` on pressing this key the blob will split in 2 smaller ones. Depending on the size of your blob it can split multiple times.<br>
`a` the blob will move automatically to the nearest pieces of food.

