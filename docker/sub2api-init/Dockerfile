FROM postgres:16-alpine

RUN apk add --no-cache curl jq

WORKDIR /app

COPY bootstrap.sh ./

RUN chmod +x /app/bootstrap.sh

CMD ["/app/bootstrap.sh"]
