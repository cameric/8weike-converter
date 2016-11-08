#! /bin/bash

# This is the CircleCI script for deploying
# master commit into aws ElasticBeanswalk
# Note that the server name needs to keep sync
# between the production server and the local VM

set -e

ROOT=$(pwd)
echo "Root dir is: $ROOT"

SHA1=$1
EB_BUCKET=8weike-core
SOURCE_BUNDLE_NAME=8weike-source-bundle
HASHED_SOURCE_BUNDLE_NAME=$SHA1-$SOURCE_BUNDLE_NAME

# RDS Production DB constants
RDS_DB_PROD_NAME=cameric8weike_db_prod
RDS_DB_PROD_HOST=cameric8weike-db.cotvuqysbx1c.us-east-1.rds.amazonaws.com
RDS_DB_PROD_PASSWORD="Yn\&}5Dz5tS#'K]$."
RDS_DB_PROD_PORT=3306
RDS_DB_PROD_USER=dbmaster

# App dependencies (files or directories) that will be mounted to aws.
# These paths could be found on AWS under `/var/app/current/`.
# Note that the paths should be relative to root directory and no `/` in the front!

# Files
SOURCE_BUNDLE_DEPS[0]=ci/flyway.prod.conf
# Directories
SOURCE_BUNDLE_DEPS_DIR[0]=db/schema

# Construct production configuration files from
# production environment variables and templates.
construct_prod_configs() {
  sed -e "s/<TAG>/$SHA1/" \
      -e "s/<RDS_DB_PROD_NAME>/$RDS_DB_PROD_NAME/" \
      -e "s/<RDS_DB_PROD_HOST>/$RDS_DB_PROD_HOST/" \
      -e "s/<RDS_DB_PROD_PASSWORD>/$RDS_DB_PROD_PASSWORD/" \
      -e "s/<RDS_DB_PROD_PORT>/$RDS_DB_PROD_PORT/" \
      -e "s/<RDS_DB_PROD_USER>/$RDS_DB_PROD_USER/" \
      < $1 > $2
}

# Set working directory for the script to /ci
cd "$(dirname "$0")"
echo "CI dir is: $(pwd)"

printf "Start pushing the new image to Docker Hub...\n"
# Push a new version onto docker hub
docker push cameric8weike/8weike-server-prod:$SHA1
printf "Finished pushing to Docker hub\n\n"

printf "Start configuring AWS CLI...\n"
aws --version
aws configure set default.region us-east-1
aws configure set default.output json
printf "Finished configuring awscli\n\n"

# Apply DB migration to production DB
printf "Creating a new snapshot for production database on RDS...\n"
aws rds create-db-snapshot \
    --db-instance-identifier cameric8weike-db \
    --db-snapshot-identifier cameric8weike-db-snapshot-$SHA1
printf "Finished creating prod DB snapshot\n\n"

printf "Construct DB migration conf from template...\n"
construct_prod_configs flyway.prod.conf.template flyway.prod.conf
printf "Finished creating migration files\n\n"

# Create new Elastic Beanstalk version
printf "Bundling up app dependencies with Dockerrun file...\n"
mkdir $SOURCE_BUNDLE_NAME
construct_prod_configs Dockerrun.aws.json.template $SOURCE_BUNDLE_NAME/Dockerrun.aws.json

# Migrate file dependencies
for i in "${SOURCE_BUNDLE_DEPS[@]}"
do
mkdir -p $(dirname "$SOURCE_BUNDLE_NAME/$i")
cp $ROOT/$i $(dirname "$SOURCE_BUNDLE_NAME/$i")
done

# Migrate directory dependencies
for j in "${SOURCE_BUNDLE_DEPS_DIR[@]}"
do
mkdir -p $SOURCE_BUNDLE_NAME/$j
cp -r $ROOT/$j/* $SOURCE_BUNDLE_NAME/$j
done

cd $SOURCE_BUNDLE_NAME && zip -r "$SOURCE_BUNDLE_NAME.zip" *
printf "Finish bundling\n\n"

printf "Uploading source bundle to S3...\n"
aws s3 cp "$SOURCE_BUNDLE_NAME.zip" s3://$EB_BUCKET/$HASHED_SOURCE_BUNDLE_NAME.zip
printf "Finished uploading source bundle to S3\n\n"

printf "Start deploying to ElasticBeanstalk..."
aws elasticbeanstalk create-application-version --application-name 8weike \
    --version-label $SHA1 --source-bundle S3Bucket=$EB_BUCKET,S3Key=$HASHED_SOURCE_BUNDLE_NAME.zip

# Update Elastic Beanstalk environment to new version
aws elasticbeanstalk update-environment --environment-name 8weike-nSERVER-prod \
    --version-label $SHA1
printf "\n\n"

printf "#######################\n"
printf "# Finished deployment #\n"
printf "#######################\n"
