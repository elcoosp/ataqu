# Run integration tests with a real PostgreSQL container
test-integration:
    @echo "🧪 Suppression des volumes PostgreSQL résiduels..."
    docker volume ls -q | grep -E '.*postgres.*' | xargs docker volume rm -f 2>/dev/null || true
    @echo "🧪 Nettoyage complet de l'environnement de test..."
    docker compose -f docker-compose.test.yml down -v
    @echo "🧪 Démarrage de PostgreSQL pour les tests..."
    docker compose -f docker-compose.test.yml up -d --force-recreate
    @echo "⏳ Attente de PostgreSQL..."
    @until docker compose -f docker-compose.test.yml exec -T postgres pg_isready; do sleep 1; done
    @echo "🔍 Vérification de la connexion avec PGPASSWORD..."
    @docker compose -f docker-compose.test.yml exec -T -e PGPASSWORD=postgres postgres psql -U postgres -d ataqu_test -c "SELECT 1" || (echo "❌ Échec de connexion à PostgreSQL" && exit 1)
    @echo "🔄 Exécution des migrations sur la base de test..."
    @export DATABASE_TEST_URL=postgres://postgres:postgres@localhost:5432/ataqu_test && cargo run --package ataqu-bin --bin migrator
    @echo "🚀 Lancement des tests d'intégration..."
    @export DATABASE_TEST_URL=postgres://postgres:postgres@localhost:5432/ataqu_test && cargo test --test integration -- --nocapture
    @echo "🧹 Nettoyage..."
    docker compose -f docker-compose.test.yml down -v
# Watch wr.sh and execute it on change
wr:
    watchexec -w ./wr.sh --clear -r "./wr.sh"
