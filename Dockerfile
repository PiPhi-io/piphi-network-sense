FROM node:22-slim AS widgets
WORKDIR /widgets
COPY widgets ./
RUN for widget in sense-energy-flow sense-device-breakdown; do \
      cd "/widgets/$widget" && npm install --ignore-scripts && npm run build; \
    done

FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml ./
COPY src ./src
RUN pip install --no-cache-dir .
COPY --from=widgets /widgets ./widgets
ENV PIPHI_WIDGET_DIR=/app/widgets
EXPOSE 8090
CMD ["uvicorn", "piphi_network_sense.main:app", "--host", "0.0.0.0", "--port", "8090"]
