FROM ubuntu:18.04

ENV DEBIAN_FRONTEND noninteractive

COPY . /app
WORKDIR /app

RUN ./build.sh

ENV PORT 80
EXPOSE 80

# Mediasoup RTC ports
EXPOSE 10000-59999/udp
EXPOSE 10000-59999/tcp

WORKDIR /built_app/bundle
CMD /built_app/scripts/run_jolly_roger.sh
