# Social Network For Music pwm project
A project for my CS classes at university
## Features
TO DO TODO
## How to create the docker image
1. Create a .env file under ./src, put there the following:
    - MONGONAME
    - MONGOPASSWORD
    - PORT
    - CLIENT_ID
    - CLIENT_SECRET
    - SECRET
2. Run `dockerize.sh` (eventually after changing your timezone)
At this point:
- You can use a graphical interface
- You can do the following:

    3. Run `rundockerized.sh`
    4. Run `dockerids.sh` and save the id of your container
    5. Fill `dockerlogs` with the correct id and run it periodically to view the logs.