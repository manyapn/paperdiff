class IntegrationNotConfigured(RuntimeError):
    def __init__(self, integration: str, next_step: str) -> None:
        self.integration = integration
        self.next_step = next_step
        super().__init__(f"{integration} is not configured")


class IntegrationFailure(RuntimeError):
    pass
