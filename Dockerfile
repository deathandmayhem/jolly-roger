FROM ubuntu:14.04

ENV DEBIAN_FRONTEND noninteractive

COPY . /app
WORKDIR /app

RUN ./build.sh

ENV PORT 80
EXPOSE 80

WORKDIR /built_app/bundle
CMD /built_app/scripts/run_jolly_roger.sh
