#! /bin/bash

# This is the CircleCI script for deploying
# master commit into aws ElasticBeanswalk
# Note that the server name needs to keep sync
# between the production server and the local VM

set -e

SHA1=$1
EB_BUCKET=8weike-converter-core
DOCKERRUN_FILE=$SHA1-Dockerrun.aws.json

# Construct production configuration files from
# production environment variables and templates.
construct_prod_configs() {
  sed -e "s/<TAG>/$SHA1/" \
      < $1 > $2
}

# Set working directory for the script to /ci
cd "$(dirname "$0")"
echo "CI dir is: $(pwd)"

printf "Start pushing the new image to Docker Hub...\n"
# Push a new version onto docker hub
docker push cameric8weike/8weike-converter-prod:$SHA1
printf "Finished pushing to Docker hub\n\n"

printf "Start configuring AWS CLI...\n"
aws --version
aws configure set default.region us-east-1
aws configure set default.output json
printf "Finished configuring awscli\n\n"

# Create new Elastic Beanstalk version
printf "Build Dockerrun file...\n"
construct_prod_configs Dockerrun.aws.json.template $DOCKERRUN_FILE

printf "Uploading Dockerrun file to S3...\n"
aws s3 cp $DOCKERRUN_FILE s3://$EB_BUCKET/$DOCKERRUN_FILE
printf "Finished uploading Dockerrun file to S3\n\n"

printf "Start deploying to ElasticBeanstalk..."
aws elasticbeanstalk create-application-version --application-name 8weike \
    --version-label $SHA1 --source-bundle S3Bucket=$EB_BUCKET,S3Key=$DOCKERRUN_FILE

# Update Elastic Beanstalk environment to new version
aws elasticbeanstalk update-environment --environment-name 8weike-converter-prod \
    --version-label $SHA1
printf "\n\n"

printf "#######################\n"
printf "# Finished deployment #\n"
printf "#######################\n"
